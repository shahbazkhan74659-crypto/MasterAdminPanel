import { pool } from "../db/pool.js";
import type { EngineName } from "../sqlConsole/connections.js";
import { getTableSchema, type FieldSchema } from "./introspection.js";
import { validateValues } from "./validation.js";
import { getRecord, updateRecord, RecordNotFoundError } from "./crud.js";

export class NoDraftError extends Error {}

export interface DraftRow {
  id: number;
  engine: EngineName;
  collection: string;
  recordId: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface DraftDbRow {
  id: number;
  engine: EngineName;
  collection: string;
  record_id: string;
  draft_values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DraftDbRow): DraftRow {
  return {
    id: row.id,
    engine: row.engine,
    collection: row.collection,
    recordId: row.record_id,
    values: row.draft_values,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Saves (or updates) the pending draft for one record — always a FULL shadow copy
 * of what the record's values would be, merging `rawValues` onto the existing
 * draft if one exists, else onto the record's current live values. This is what
 * makes deploy a plain overwrite: draft.values already holds every field, not
 * just the ones most recently changed.
 */
export async function saveDraft(
  engine: EngineName,
  collection: string,
  recordId: string,
  rawValues: Record<string, unknown>
): Promise<DraftRow> {
  const schema = await getTableSchema(engine, collection);
  const existingDraft = await getDraft(engine, collection, recordId);

  let base: Record<string, unknown>;
  if (existingDraft) {
    base = existingDraft.values;
  } else {
    const live = await getRecord(engine, collection, recordId);
    if (!live) {
      throw new RecordNotFoundError(`Record "${recordId}" not found`);
    }
    base = live as Record<string, unknown>;
  }

  const merged: Record<string, unknown> = { ...base, ...rawValues };
  if (schema.primaryKey) delete merged[schema.primaryKey];
  const values = validateValues(schema, merged, "update");

  const result = await pool.query<DraftDbRow>(
    `INSERT INTO drafts (engine, collection, record_id, draft_values)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (engine, collection, record_id)
     DO UPDATE SET draft_values = $4, updated_at = now()
     RETURNING id, engine, collection, record_id, draft_values, created_at, updated_at`,
    [engine, collection, recordId, JSON.stringify(values)]
  );
  return mapRow(result.rows[0]);
}

export async function getDraft(engine: EngineName, collection: string, recordId: string): Promise<DraftRow | null> {
  const result = await pool.query<DraftDbRow>(
    `SELECT id, engine, collection, record_id, draft_values, created_at, updated_at
     FROM drafts WHERE engine = $1 AND collection = $2 AND record_id = $3`,
    [engine, collection, recordId]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

// Not exposed as a route this phase -- forward-compat for a future "pending
// changes" list, kept so it doesn't need inventing later from scratch.
export async function listDrafts(engine: EngineName, collection: string): Promise<DraftRow[]> {
  const result = await pool.query<DraftDbRow>(
    `SELECT id, engine, collection, record_id, draft_values, created_at, updated_at
     FROM drafts WHERE engine = $1 AND collection = $2 ORDER BY updated_at DESC`,
    [engine, collection]
  );
  return result.rows.map(mapRow);
}

// Spans every collection for an engine, unlike listDrafts (one collection) --
// backs the bulk "deploy every pending draft for the site" action.
export async function listAllDrafts(engine: EngineName): Promise<DraftRow[]> {
  const result = await pool.query<DraftDbRow>(
    `SELECT id, engine, collection, record_id, draft_values, created_at, updated_at
     FROM drafts WHERE engine = $1 ORDER BY updated_at ASC`,
    [engine]
  );
  return result.rows.map(mapRow);
}

export async function discardDraft(engine: EngineName, collection: string, recordId: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM drafts WHERE engine = $1 AND collection = $2 AND record_id = $3`, [
    engine,
    collection,
    recordId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export interface DiffField {
  live: unknown;
  draft: unknown;
  changed: boolean;
}

export interface DiffResult {
  live: Record<string, unknown>;
  draft: Record<string, unknown>;
  hasDraft: boolean;
  fields: FieldSchema[];
  diff: Record<string, DiffField>;
}

/**
 * Live vs. draft comparison, computed server-side so the frontend never needs
 * schema-aware coercion/comparison logic. The live row is run through the same
 * validateValues() coercion a draft's values already went through at save time
 * (e.g. SQLite's raw 0/1 booleans vs. a draft's real JS booleans) so the diff
 * doesn't flag type-representation differences as real changes.
 */
export async function getDraftWithLiveDiff(
  engine: EngineName,
  collection: string,
  recordId: string
): Promise<DiffResult | null> {
  const schema = await getTableSchema(engine, collection);
  const liveRaw = await getRecord(engine, collection, recordId);
  if (!liveRaw) return null;

  const liveWithoutPk = { ...(liveRaw as Record<string, unknown>) };
  if (schema.primaryKey) delete liveWithoutPk[schema.primaryKey];
  const normalizedLive = validateValues(schema, liveWithoutPk, "update");

  const draftRow = await getDraft(engine, collection, recordId);
  const draftValues = draftRow ? draftRow.values : normalizedLive;

  const diff: Record<string, DiffField> = {};
  for (const field of schema.fields) {
    if (field.isPrimaryKey) continue;
    const liveVal = normalizedLive[field.name];
    const draftVal = draftValues[field.name];
    diff[field.name] = { live: liveVal, draft: draftVal, changed: JSON.stringify(liveVal) !== JSON.stringify(draftVal) };
  }

  return { live: normalizedLive, draft: draftValues, hasDraft: draftRow !== null, fields: schema.fields, diff };
}

/**
 * Applies a pending draft to the live database. Reuses crud.ts's updateRecord
 * directly for the actual write -- no per-engine SQL lives in this file. Schema
 * drift between stage-time and deploy-time is handled for free: updateRecord's
 * own validateValues call throws a normal ValidationError (-> 400) if a staged
 * field no longer matches the live schema. Confirm-gating and the Phase 8
 * protected-table policy check are deliberately NOT here -- they're HTTP/policy
 * concerns, applied in stagingRoutes.ts before this is ever called.
 */
export async function deployDraft(engine: EngineName, collection: string, recordId: string): Promise<{ record: unknown }> {
  const draft = await getDraft(engine, collection, recordId);
  if (!draft) {
    throw new NoDraftError(`No pending draft for "${collection}" record "${recordId}"`);
  }

  const updated = await updateRecord(engine, collection, recordId, draft.values);
  if (!updated) {
    throw new RecordNotFoundError(`Record "${recordId}" not found`);
  }

  await pool.query(`INSERT INTO deploy_log (engine, collection, record_id, deployed_values) VALUES ($1, $2, $3, $4)`, [
    engine,
    collection,
    recordId,
    JSON.stringify(updated),
  ]);
  await pool.query(`DELETE FROM drafts WHERE engine = $1 AND collection = $2 AND record_id = $3`, [
    engine,
    collection,
    recordId,
  ]);

  return { record: updated };
}
