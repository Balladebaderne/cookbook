import sqlite3 from "sqlite3";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default fallback puts app.db in backend/ to match the pre-split layout.
// In Docker, DB_PATH is set to /app/data/app.db so this fallback is unused.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "app.db");
const POSTGRES_REQUIRED_ENV = ["POSTGRES_HOST", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"];

export function hasPostgresConfig(env = process.env) {
  return Boolean(env.DATABASE_URL || POSTGRES_REQUIRED_ENV.some((name) => env[name]));
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

export function toPostgresSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export function sqlWithReturningId(sql) {
  if (/returning\s+/i.test(sql)) return sql;
  if (!/^\s*insert\s+into\s+(recipes|ingredients|tags)\b/i.test(sql)) return sql;
  return `${sql.trim().replace(/;$/, "")} RETURNING id`;
}

class SQLiteDatabase {
  constructor(filename) {
    this.dialect = "sqlite";
    this.db = new sqlite3.Database(filename, (err) => {
      if (err) console.error("Database connection error:", err);
      else console.log("Connected to SQLite database at", filename);
    });
    this.db.run("PRAGMA foreign_keys = ON");
  }

  prepare(sql) {
    return {
      run: (...params) => new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID, lastID: this.lastID });
        });
      }),
      all: (...params) => new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      }),
      get: (...params) => new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    };
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async transaction(callback) {
    await this.exec("BEGIN TRANSACTION");
    try {
      const result = await callback(this);
      await this.exec("COMMIT");
      return result;
    } catch (err) {
      await this.exec("ROLLBACK").catch(() => {});
      throw err;
    }
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
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
      const result = await queryable.query(toPostgresSql(sqlWithReturningId(sql)), params);
      const id = result.rows[0]?.id;
      return { lastInsertRowid: id, lastID: id, rowCount: result.rowCount };
    },
    all: async (...params) => {
      const result = await queryable.query(toPostgresSql(sql), params);
      return result.rows || [];
    },
    get: async (...params) => {
      const result = await queryable.query(toPostgresSql(sql), params);
      return result.rows[0];
    },
  };
}

const selectedDb = hasPostgresConfig()
  ? new PostgresDatabase(postgresConfig())
  : (() => {
      console.log("DB_PATH:", DB_PATH);
      return new SQLiteDatabase(DB_PATH);
    })();

export const db = selectedDb;
