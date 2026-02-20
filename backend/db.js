import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "app.db");
console.log("DB_PATH:", DB_PATH);

// Promisify sqlite3 for easier use
class Database {
  constructor(filename) {
    this.db = new sqlite3.Database(filename, (err) => {
      if (err) console.error("Database connection error:", err);
      else console.log("Connected to SQLite database at", filename);
    });
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

  transaction(fn) {
    return async () => {
      try {
        await this.exec("BEGIN TRANSACTION");
        await fn();
        await this.exec("COMMIT");
      } catch (err) {
        await this.exec("ROLLBACK");
        throw err;
      }
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

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const db = new Database(DB_PATH);
