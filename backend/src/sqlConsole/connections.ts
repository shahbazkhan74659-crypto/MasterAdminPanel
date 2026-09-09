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

// Phase 7 — real, external sites' own databases, connected to directly (their credentials, not
// their code — no site's own repo is ever touched). Postgres-only for now since that's all any
// connected site currently needs; add another case here if a future site needs mysql/sqlite.
export interface RemoteSiteConfig {
  engine: "postgres";
  pool: Pool;
}

const REMOTE_SITE_IDS = ["portfolio"]; // add more site ids here as more sites get connected

export const remoteSites: Record<string, RemoteSiteConfig> = {};
for (const id of REMOTE_SITE_IDS) {
  const prefix = `REMOTE_SITE_${id.toUpperCase()}`;
  remoteSites[id] = {
    engine: "postgres",
    pool: new Pool({
      host: process.env[`${prefix}_HOST`],
      port: Number(process.env[`${prefix}_PORT`]),
      database: process.env[`${prefix}_NAME`],
      user: process.env[`${prefix}_USER`],
      password: process.env[`${prefix}_PASSWORD`],
    }),
  };
}
