import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB ligger i repo-root, ikke i /server
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "app.db");
console.log("DB_PATH:", DB_PATH);
export const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");
