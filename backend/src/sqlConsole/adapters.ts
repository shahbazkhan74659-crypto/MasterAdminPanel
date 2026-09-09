import type { ResultSetHeader } from "mysql2";
import { pgPool, mysqlPool, sqliteDb } from "./connections.js";

export interface QueryResult {
  columns: string[];
  rows: unknown[];
  rowCount: number;
  elapsedMs: number;
  command?: string;
}

export async function runPostgresQuery(sql: string): Promise<QueryResult> {
  const start = Date.now();
  const result = await pgPool.query(sql);
  const elapsedMs = Date.now() - start;
  return {
    columns: result.fields.map((f) => f.name),
    rows: result.rows,
    rowCount: result.rowCount ?? result.rows.length,
    elapsedMs,
    command: result.command,
  };
}

export async function runMysqlQuery(sql: string): Promise<QueryResult> {
  const start = Date.now();
  const [rows, fields] = await mysqlPool.query(sql);
  const elapsedMs = Date.now() - start;

  if (Array.isArray(rows)) {
    return {
      columns: (fields ?? []).map((f) => f.name),
      rows,
      rowCount: rows.length,
      elapsedMs,
    };
  }

  const header = rows as ResultSetHeader;
  return {
    columns: [],
    rows: [],
    rowCount: header.affectedRows,
    elapsedMs,
  };
}

export function runSqliteQuery(sql: string): QueryResult {
  const stmt = sqliteDb.prepare(sql);
  const start = Date.now();

  if (stmt.reader) {
    const rows = stmt.all();
    const elapsedMs = Date.now() - start;
    const columns = stmt.columns().map((c) => c.name);
    return { columns, rows, rowCount: rows.length, elapsedMs };
  }

  const info = stmt.run();
  const elapsedMs = Date.now() - start;
  return { columns: [], rows: [], rowCount: info.changes, elapsedMs };
}

export async function listPostgresTables(): Promise<string[]> {
  const result = await pgPool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  return result.rows.map((r: { table_name: string }) => r.table_name);
}

export async function listMysqlTables(): Promise<string[]> {
  const [rows] = await mysqlPool.query(
    "SELECT table_name AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name"
  );
  return (rows as Array<{ table_name: string }>).map((r) => r.table_name);
}

export function listSqliteTables(): string[] {
  const rows = sqliteDb
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}
