import pg from "pg";

const POSTGRES_REQUIRED_ENV = ["POSTGRES_HOST", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"];

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

export const db = new PostgresDatabase(postgresConfig());
