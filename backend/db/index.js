import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default fallback puts app.db in backend/ to match the pre-split layout.
// In Docker, DB_PATH is set to /app/data/app.db so this fallback is unused.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "app.db");
console.log("DB_PATH:", DB_PATH);

class Database {
  constructor(filename) {
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
