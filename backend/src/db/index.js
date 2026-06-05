import pg from "pg";
import { dbQueryDuration } from "../metrics.js";

const POSTGRES_REQUIRED_ENV = ["POSTGRES_HOST", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"];

// First SQL keyword (select/insert/update/delete/…) — the metric label, so DB
// latency can be sliced by operation in Prometheus/Grafana without recording
// the full (high-cardinality) query text.
export function queryOperation(sql) {
  const match = /^\s*([a-z]+)/i.exec(sql);
  return match ? match[1].toLowerCase() : "other";
}

// Times a single query and records db_query_duration_seconds, labelled by
// operation + success/error, regardless of whether the query throws.
async function timedQuery(queryable, text, params, originalSql) {
  const end = dbQueryDuration.startTimer({ operation: queryOperation(originalSql) });
  try {
    const result = await queryable.query(text, params);
    end({ status: "success" });
    return result;
  } catch (err) {
    end({ status: "error" });
    throw err;
  }
}

export function postgresConfig(env = process.env) {
  if (env.DATABASE_URL) {
    return { connectionString: env.DATABASE_URL };
  }

  const missing = POSTGRES_REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing Postgres configuration: ${missing.join(", ")}`);
  }

  return {
    host: env.POSTGRES_HOST,
    port: Number(env.POSTGRES_PORT || 5432),
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
  };
}

// Queries are written with `?` placeholders; translate them to Postgres `$n`.
export function toPostgresSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// INSERTs need `RETURNING id` so run() can report the generated id.
export function sqlWithReturningId(sql) {
  if (/returning\s+/i.test(sql)) return sql;
  if (!/^\s*insert\s+into\s+(recipes|ingredients|tags|users)\b/i.test(sql)) return sql;
  return `${sql.trim().replace(/;$/, "")} RETURNING id`;
}

export class PostgresDatabase {
  constructor(config, PoolClass = pg.Pool) {
    this.dialect = "postgres";
    this.pool = new PoolClass(config);
    console.log("Connected to Postgres database");
  }

  prepare(sql) {
    const queryable = this.pool;
    return postgresStatement(queryable, sql);
  }

  async exec(sql) {
    await this.pool.query(sql);
  }

  async close() {
    await this.pool.end();
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    const tx = new PostgresTransaction(client);
    try {
      await client.query("BEGIN");
      const result = await callback(tx);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

class PostgresTransaction {
  constructor(client) {
    this.dialect = "postgres";
    this.client = client;
  }

  prepare(sql) {
    return postgresStatement(this.client, sql);
  }

  async exec(sql) {
    await this.client.query(sql);
  }

  close() {
    return Promise.resolve();
  }
}

export function postgresStatement(queryable, sql) {
  return {
    run: async (...params) => {
      const result = await timedQuery(queryable, toPostgresSql(sqlWithReturningId(sql)), params, sql);
      const id = result.rows[0]?.id;
      return { lastInsertRowid: id, rowCount: result.rowCount };
    },
    all: async (...params) => {
      const result = await timedQuery(queryable, toPostgresSql(sql), params, sql);
      return result.rows || [];
    },
    get: async (...params) => {
      const result = await timedQuery(queryable, toPostgresSql(sql), params, sql);
      return result.rows[0];
    },
  };
}

export const db = new PostgresDatabase(postgresConfig());
