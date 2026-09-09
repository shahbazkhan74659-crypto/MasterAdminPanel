import { Pool } from "pg";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Self-loaded, same reasoning as db/pool.ts: ES module imports are hoisted
// and evaluate before index.ts's own dotenv.config() call runs, so this
// module must load its own env before reading process.env (safe to call
// dotenv.config twice — it won't override already-set vars).
dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

export type EngineName = "postgres" | "mysql" | "sqlite";

export const pgPool = new Pool({
  host: process.env.TARGET_PG_HOST,
  port: Number(process.env.TARGET_PG_PORT),
  database: process.env.TARGET_PG_NAME,
  user: process.env.TARGET_PG_USER,
  password: process.env.TARGET_PG_PASSWORD,
});

export const mysqlPool = mysql.createPool({
  host: process.env.TARGET_MYSQL_HOST,
  port: Number(process.env.TARGET_MYSQL_PORT),
  database: process.env.TARGET_MYSQL_NAME,
  user: process.env.TARGET_MYSQL_USER,
  password: process.env.TARGET_MYSQL_PASSWORD,
});

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const sqlitePath = path.resolve(repoRoot, process.env.TARGET_SQLITE_PATH ?? "");

// One shared, read-write handle for the life of the process (not readonly
// like the Phase 3 test route — the console needs to run confirmed writes).
// better-sqlite3 is synchronous and single-process, so a "pool" doesn't apply.
export const sqliteDb = new Database(sqlitePath);
