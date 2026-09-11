import { pool } from "./pool.js";

export async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS secrets (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL CHECK (category IN ('db-credential', 'api-key')),
      key TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (category, key)
    );
  `);

  // Phase 23 — Staging Layer. At most one pending draft per (engine, collection,
  // record_id) — a draft is always a full shadow copy of the record's would-be
  // values (never a partial diff), so deploying it is a plain overwrite. Lives in
  // AdminPanel's own metadata DB regardless of which engine the target record is
  // on; record_id is an unenforced logical key (cross-database FKs aren't possible
  // here), same trust model crud.ts already applies to table/column names.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      engine TEXT NOT NULL CHECK (engine IN ('postgres', 'mysql', 'sqlite')),
      collection TEXT NOT NULL,
      record_id TEXT NOT NULL,
      draft_values JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (engine, collection, record_id)
    );
  `);

  // Append-only record of past deploys, populated from the row updateRecord
  // already returns at deploy time (no extra queries). No read endpoint/UI exists
  // against this yet -- it's a cheap forward-compat hook for a future deploy-history
  // feature, kept deliberately separate from `drafts` (which models "what's
  // currently being edited", not "what has shipped").
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deploy_log (
      id SERIAL PRIMARY KEY,
      engine TEXT NOT NULL CHECK (engine IN ('postgres', 'mysql', 'sqlite')),
      collection TEXT NOT NULL,
      record_id TEXT NOT NULL,
      deployed_values JSONB NOT NULL,
      deployed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_deploy_log_record ON deploy_log (engine, collection, record_id);
  `);
}
