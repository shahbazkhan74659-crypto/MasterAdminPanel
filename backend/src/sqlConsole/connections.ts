import { Pool } from "pg";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireSecret } from "../secrets/store.js";

export type EngineName = "postgres" | "mysql" | "sqlite";

interface PgCredential {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface MysqlCredential {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface SqliteCredential {
  path: string;
}

export let pgPool: Pool;
export let mysqlPool: ReturnType<typeof mysql.createPool>;
export let sqliteDb: Database.Database;

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

// Phase 7 — real, external sites' own databases, connected to directly (their credentials, not
// their code — no site's own repo is ever touched). Postgres-only for now since that's all any
// connected site currently needs; add another case here if a future site needs mysql/sqlite.
export interface RemoteSiteConfig {
  engine: "postgres";
  pool: Pool;
}

export const REMOTE_SITE_IDS = ["portfolio"]; // add more site ids here as more sites get connected

export const remoteSites: Record<string, RemoteSiteConfig> = {};

/**
 * Builds every DB connection from the Phase 10 encrypted secrets store instead of process.env.
 * Must be awaited during server bootstrap, before any route that reads pgPool/mysqlPool/sqliteDb/
 * remoteSites runs — same ordering requirement as ensureSchema().
 */
export async function initConnections(): Promise<void> {
  pgPool = new Pool(await requireSecret<PgCredential>("db-credential", "target-postgres"));
  mysqlPool = mysql.createPool(await requireSecret<MysqlCredential>("db-credential", "target-mysql"));

  const sqliteCred = await requireSecret<SqliteCredential>("db-credential", "target-sqlite");
  // One shared, read-write handle for the life of the process (not readonly
  // like the Phase 3 test route — the console needs to run confirmed writes).
  // better-sqlite3 is synchronous and single-process, so a "pool" doesn't apply.
  sqliteDb = new Database(path.resolve(repoRoot, sqliteCred.path));

  for (const id of REMOTE_SITE_IDS) {
    const cred = await requireSecret<PgCredential>("db-credential", `remote-site:${id}`);
    remoteSites[id] = { engine: "postgres", pool: new Pool(cred) };
  }
}
