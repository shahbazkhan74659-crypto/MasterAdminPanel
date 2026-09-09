import { Router } from "express";
import { isWriteStatement, hasMultipleStatements } from "./classify.js";
import { isWriteBlockedByPolicy } from "./policy.js";
import { pgPool, remoteSites } from "./connections.js";
import {
  runPostgresQuery,
  runMysqlQuery,
  runSqliteQuery,
  listPostgresTables,
  listMysqlTables,
  listSqliteTables,
  type QueryResult,
} from "./adapters.js";

interface GatedResponse {
  status: number;
  body: { ok: boolean; error?: string } & Partial<QueryResult>;
}

/**
 * Shared gate for both query routes below (local engines and Phase 7 remote sites):
 * reject multiple statements, block writes to a policy-protected table outright
 * (Phase 8, regardless of confirm), require confirm:true for any other write, then
 * run the query. One choke point so the policy applies identically everywhere.
 */
async function gatedQuery(sql: string, confirm: unknown, run: () => Promise<QueryResult>): Promise<GatedResponse> {
  if (hasMultipleStatements(sql)) {
    return { status: 400, body: { ok: false, error: "multiple statements are not supported" } };
  }

  if (isWriteStatement(sql)) {
    if (isWriteBlockedByPolicy(sql)) {
      return { status: 403, body: { ok: false, error: "Writes to this table are blocked by policy" } };
    }
    if (confirm !== true) {
      return { status: 409, body: { ok: false, error: "Non-SELECT statement requires confirm:true" } };
    }
  }

  const result = await run();
  return { status: 200, body: { ok: true, ...result } };
}

const ALLOWED_ENGINES = ["postgres", "mysql", "sqlite"] as const;
type Engine = (typeof ALLOWED_ENGINES)[number];

function isValidEngine(engine: string): engine is Engine {
  return (ALLOWED_ENGINES as readonly string[]).includes(engine);
}

async function runQuery(engine: Engine, sql: string): Promise<QueryResult> {
  switch (engine) {
    case "postgres":
      return runPostgresQuery(pgPool, sql);
    case "mysql":
      return runMysqlQuery(sql);
    case "sqlite":
      return runSqliteQuery(sql);
  }
}

async function listTables(engine: Engine): Promise<string[]> {
  switch (engine) {
    case "postgres":
      return listPostgresTables(pgPool);
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

  try {
    const { status, body } = await gatedQuery(sql, confirm, () => runQuery(engine, sql));
    res.status(status).json(body);
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Phase 7 — real, external sites' own databases (their credentials, not their code), connected to
// directly rather than through any API the site implements. Same safety posture and response shape
// as the local-engine routes above, distinguished by site id instead of a fixed engine literal.

sqlConsoleRoutes.get("/sites/:siteId/tables", async (req, res) => {
  const { siteId } = req.params;
  const site = remoteSites[siteId];
  if (!site) {
    res.status(400).json({ ok: false, error: `Unknown site "${siteId}"` });
    return;
  }

  try {
    const tables = await listPostgresTables(site.pool);
    res.json({ ok: true, tables });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

sqlConsoleRoutes.post("/sites/:siteId/query", async (req, res) => {
  const { siteId } = req.params;
  const site = remoteSites[siteId];
  if (!site) {
    res.status(400).json({ ok: false, error: `Unknown site "${siteId}"` });
    return;
  }

  const { sql, confirm } = req.body ?? {};
  if (typeof sql !== "string" || !sql.trim()) {
    res.status(400).json({ ok: false, error: "sql (string) is required" });
    return;
  }

  try {
    const { status, body } = await gatedQuery(sql, confirm, () => runPostgresQuery(site.pool, sql));
    res.status(status).json(body);
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});
