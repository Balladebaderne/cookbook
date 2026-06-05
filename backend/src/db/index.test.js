import { describe, expect, it } from "vitest";
import {
  postgresConfig,
  postgresStatement,
  PostgresDatabase,
  queryOperation,
  sqlWithReturningId,
  toPostgresSql,
} from "./index.js";
import { register } from "../metrics.js";

describe("db/index Postgres configuration", () => {
  it("uses DATABASE_URL as a connection string when present", () => {
    expect(postgresConfig({ DATABASE_URL: "postgres://user:pass@db/app" })).toEqual({
      connectionString: "postgres://user:pass@db/app",
    });
  });

  it("builds a host-based Postgres config with the default port", () => {
    expect(postgresConfig({
      POSTGRES_HOST: "10.0.0.5",
      POSTGRES_DB: "cookbook",
      POSTGRES_USER: "app",
      POSTGRES_PASSWORD: "secret",
    })).toEqual({
      host: "10.0.0.5",
      port: 5432,
      database: "cookbook",
      user: "app",
      password: "secret",
    });
  });

  it("fails fast when only partial Postgres config is present", () => {
    expect(() => postgresConfig({ POSTGRES_HOST: "10.0.0.5" }))
      .toThrow("Missing Postgres configuration: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD");
  });
});

describe("db/index Postgres SQL adapter", () => {
  it("converts `?` placeholders to Postgres placeholders in order", () => {
    expect(toPostgresSql("SELECT * FROM recipes WHERE country = ? AND id IN (?, ?)"))
      .toBe("SELECT * FROM recipes WHERE country = $1 AND id IN ($2, $3)");
  });

  it("adds RETURNING id to inserts that need generated ids", () => {
    expect(sqlWithReturningId("INSERT INTO recipes (title) VALUES (?)"))
      .toBe("INSERT INTO recipes (title) VALUES (?) RETURNING id");
    expect(sqlWithReturningId("INSERT INTO users (email) VALUES (?)"))
      .toBe("INSERT INTO users (email) VALUES (?) RETURNING id");
    expect(sqlWithReturningId("INSERT INTO ingredients (name) VALUES (?) RETURNING id"))
      .toBe("INSERT INTO ingredients (name) VALUES (?) RETURNING id");
    expect(sqlWithReturningId("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)"))
      .toBe("INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)");
  });

  it("maps run/get/all to pg query results", async () => {
    const calls = [];
    const queryable = {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [{ id: 42, name: "Pasta" }], rowCount: 1 };
      },
    };

    const statement = postgresStatement(queryable, "INSERT INTO ingredients (name) VALUES (?)");
    await expect(statement.run("Pasta")).resolves.toEqual({
      lastInsertRowid: 42,
      rowCount: 1,
    });

    await expect(postgresStatement(queryable, "SELECT id FROM ingredients WHERE name = ?").get("Pasta"))
      .resolves.toEqual({ id: 42, name: "Pasta" });
    await expect(postgresStatement(queryable, "SELECT id FROM ingredients").all())
      .resolves.toEqual([{ id: 42, name: "Pasta" }]);

    expect(calls).toEqual([
      {
        sql: "INSERT INTO ingredients (name) VALUES ($1) RETURNING id",
        params: ["Pasta"],
      },
      {
        sql: "SELECT id FROM ingredients WHERE name = $1",
        params: ["Pasta"],
      },
      {
        sql: "SELECT id FROM ingredients",
        params: [],
      },
    ]);
  });

  it("classifies the SQL operation for the db metric label", () => {
    expect(queryOperation("SELECT * FROM recipes")).toBe("select");
    expect(queryOperation("  insert into users (email) values (?)")).toBe("insert");
    expect(queryOperation("UPDATE recipes SET title = ?")).toBe("update");
    expect(queryOperation("DELETE FROM tags WHERE id = ?")).toBe("delete");
    expect(queryOperation("")).toBe("other");
  });

  it("records db_query_duration_seconds for executed statements", async () => {
    const queryable = {
      async query() {
        return { rows: [{ id: 1 }], rowCount: 1 };
      },
    };

    await postgresStatement(queryable, "SELECT id FROM recipes WHERE id = ?").get(1);

    const metrics = await register.getMetricsAsJSON();
    const metric = metrics.find((m) => m.name === "db_query_duration_seconds");
    expect(metric).toBeTruthy();

    const count = metric.values.find(
      (v) =>
        v.metricName === "db_query_duration_seconds_count" &&
        v.labels.operation === "select" &&
        v.labels.status === "success"
    );
    expect(count?.value).toBeGreaterThanOrEqual(1);
  });

  it("records a failed db query with status=error and still rejects", async () => {
    const queryable = {
      async query() {
        throw new Error("db down");
      },
    };

    await expect(postgresStatement(queryable, "SELECT 1").all()).rejects.toThrow("db down");

    const metrics = await register.getMetricsAsJSON();
    const metric = metrics.find((m) => m.name === "db_query_duration_seconds");
    const errorCount = metric.values.find(
      (v) =>
        v.metricName === "db_query_duration_seconds_count" &&
        v.labels.operation === "select" &&
        v.labels.status === "error"
    );
    expect(errorCount?.value).toBeGreaterThanOrEqual(1);
  });

  it("runs Postgres transactions on a single client and releases it", async () => {
    const calls = [];
    const client = {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [{ id: 7 }], rowCount: 1 };
      },
      release() {
        calls.push({ sql: "release" });
      },
    };
    class FakePool {
      connect() {
        calls.push({ sql: "connect" });
        return client;
      }
    }

    const database = new PostgresDatabase({ database: "cookbook" }, FakePool);
    const id = await database.transaction(async (tx) => {
      const result = await tx.prepare("INSERT INTO recipes (title) VALUES (?)").run("Soup");
      return result.lastInsertRowid;
    });

    expect(id).toBe(7);
    expect(calls).toEqual([
      { sql: "connect" },
      { sql: "BEGIN", params: undefined },
      { sql: "INSERT INTO recipes (title) VALUES ($1) RETURNING id", params: ["Soup"] },
      { sql: "COMMIT", params: undefined },
      { sql: "release" },
    ]);
  });

  it("rolls back and releases the client when a Postgres transaction fails", async () => {
    const calls = [];
    const client = {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
      release() {
        calls.push({ sql: "release" });
      },
    };
    class FakePool {
      connect() {
        calls.push({ sql: "connect" });
        return client;
      }
    }

    const database = new PostgresDatabase({ database: "cookbook" }, FakePool);
    await expect(database.transaction(async () => {
      throw new Error("boom");
    })).rejects.toThrow("boom");

    expect(calls).toEqual([
      { sql: "connect" },
      { sql: "BEGIN", params: undefined },
      { sql: "ROLLBACK", params: undefined },
      { sql: "release" },
    ]);
  });
});
