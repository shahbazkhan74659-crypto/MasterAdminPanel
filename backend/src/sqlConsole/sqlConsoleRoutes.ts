import { Router } from "express";
import { isWriteStatement, hasMultipleStatements } from "./classify.js";
import {
  runPostgresQuery,
  runMysqlQuery,
  runSqliteQuery,
  listPostgresTables,
  listMysqlTables,
  listSqliteTables,
  type QueryResult,
} from "./adapters.js";

const ALLOWED_ENGINES = ["postgres", "mysql", "sqlite"] as const;
type Engine = (typeof ALLOWED_ENGINES)[number];

function isValidEngine(engine: string): engine is Engine {
  return (ALLOWED_ENGINES as readonly string[]).includes(engine);
}

async function runQuery(engine: Engine, sql: string): Promise<QueryResult> {
  switch (engine) {
    case "postgres":
      return runPostgresQuery(sql);
    case "mysql":
      return runMysqlQuery(sql);
    case "sqlite":
      return runSqliteQuery(sql);
  }
}

async function listTables(engine: Engine): Promise<string[]> {
  switch (engine) {
    case "postgres":
      return listPostgresTables();
    case "mysql":
      return listMysqlTables();
    case "sqlite":
      return listSqliteTables();
  }
}

export const sqlConsoleRoutes = Router();

sqlConsoleRoutes.get("/:engine/tables", async (req, res) => {
  const { engine } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }

  try {
    const tables = await listTables(engine);
    res.json({ ok: true, tables });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

sqlConsoleRoutes.post("/:engine/query", async (req, res) => {
  const { engine } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }

  const { sql, confirm } = req.body ?? {};
  if (typeof sql !== "string" || !sql.trim()) {
    res.status(400).json({ ok: false, error: "sql (string) is required" });
    return;
  }

  if (hasMultipleStatements(sql)) {
    res.status(400).json({ ok: false, error: "multiple statements are not supported" });
    return;
  }

  if (isWriteStatement(sql) && confirm !== true) {
    res.status(409).json({ ok: false, error: "Non-SELECT statement requires confirm:true" });
    return;
  }

  try {
    const result = await runQuery(engine, sql);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});
