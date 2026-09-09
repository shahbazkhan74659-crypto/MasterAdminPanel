import type { ResultSetHeader } from "mysql2";
import { pgPool, mysqlPool, sqliteDb, type EngineName } from "../sqlConsole/connections.js";
import { getTableSchema, type CollectionSchema } from "./introspection.js";
import { validateValues } from "./validation.js";

export class NoPrimaryKeyError extends Error {}
export class RecordNotFoundError extends Error {}

function quoteIdent(engine: EngineName, name: string): string {
  return engine === "postgres" ? `"${name}"` : `\`${name}\``;
}

/** better-sqlite3 only binds numbers/strings/bigints/buffers/null — not JS booleans. */
function toSqliteParams(values: unknown[]): unknown[] {
  return values.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
}

function requirePrimaryKey(schema: CollectionSchema): string {
  if (!schema.primaryKey) {
    throw new NoPrimaryKeyError(
      schema.primaryKeyColumns.length === 0
        ? `collection "${schema.collection}" has no primary key — record-level operations are not supported`
        : `collection "${schema.collection}" has a composite primary key (${schema.primaryKeyColumns.join(", ")}) — Phase 6 only supports single-column primary keys`
    );
  }
  return schema.primaryKey;
}

export async function listRecords(
  engine: EngineName,
  collection: string,
  limit: number,
  offset: number
): Promise<{ schema: CollectionSchema; rows: unknown[] }> {
  const schema = await getTableSchema(engine, collection);
  const table = quoteIdent(engine, collection);
  const orderBy = schema.primaryKey ? ` ORDER BY ${quoteIdent(engine, schema.primaryKey)}` : "";

  if (engine === "postgres") {
    const result = await pgPool.query(`SELECT * FROM ${table}${orderBy} LIMIT $1 OFFSET $2`, [limit, offset]);
    return { schema, rows: result.rows };
  }
  if (engine === "mysql") {
    const [rows] = await mysqlPool.query(`SELECT * FROM ${table}${orderBy} LIMIT ? OFFSET ?`, [limit, offset]);
    return { schema, rows: rows as unknown[] };
  }
  const rows = sqliteDb.prepare(`SELECT * FROM ${table}${orderBy} LIMIT ? OFFSET ?`).all(limit, offset);
  return { schema, rows };
}

export async function getRecord(engine: EngineName, collection: string, id: string): Promise<unknown | null> {
  const schema = await getTableSchema(engine, collection);
  const pk = requirePrimaryKey(schema);
  const table = quoteIdent(engine, collection);
  const pkCol = quoteIdent(engine, pk);

  if (engine === "postgres") {
    const result = await pgPool.query(`SELECT * FROM ${table} WHERE ${pkCol} = $1`, [id]);
    return result.rows[0] ?? null;
  }
  if (engine === "mysql") {
    const [rows] = await mysqlPool.query(`SELECT * FROM ${table} WHERE ${pkCol} = ?`, [id]);
    return (rows as unknown[])[0] ?? null;
  }
  const row = sqliteDb.prepare(`SELECT * FROM ${table} WHERE ${pkCol} = ?`).get(id);
  return row ?? null;
}

export async function createRecord(
  engine: EngineName,
  collection: string,
  rawValues: Record<string, unknown>
): Promise<unknown> {
  const schema = await getTableSchema(engine, collection);
  const values = validateValues(schema, rawValues, "create");
  const table = quoteIdent(engine, collection);
  const columns = Object.keys(values);
  const params = Object.values(values);

  if (columns.length === 0) {
    throw new Error("Cannot create a record with no fields");
  }

  if (engine === "postgres") {
    const cols = columns.map((c) => quoteIdent(engine, c)).join(", ");
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pgPool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`, params);
    return result.rows[0];
  }

  if (engine === "mysql") {
    requirePrimaryKey(schema);
    const cols = columns.map((c) => quoteIdent(engine, c)).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const [result] = await mysqlPool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, params);
    const insertId = (result as ResultSetHeader).insertId;
    return getRecord(engine, collection, String(insertId));
  }

  requirePrimaryKey(schema);
  const cols = columns.map((c) => quoteIdent(engine, c)).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const info = sqliteDb.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).run(...toSqliteParams(params));
  return getRecord(engine, collection, String(info.lastInsertRowid));
}

export async function updateRecord(
  engine: EngineName,
  collection: string,
  id: string,
  rawValues: Record<string, unknown>
): Promise<unknown | null> {
  const schema = await getTableSchema(engine, collection);
  const pk = requirePrimaryKey(schema);
  const values = validateValues(schema, rawValues, "update");
  const table = quoteIdent(engine, collection);
  const pkCol = quoteIdent(engine, pk);
  const columns = Object.keys(values);
  const params = Object.values(values);

  if (columns.length === 0) {
    throw new Error("Cannot update a record with no fields");
  }

  if (engine === "postgres") {
    const setClause = columns.map((c, i) => `${quoteIdent(engine, c)} = $${i + 1}`).join(", ");
    const result = await pgPool.query(`UPDATE ${table} SET ${setClause} WHERE ${pkCol} = $${columns.length + 1} RETURNING *`, [
      ...params,
      id,
    ]);
    return result.rows[0] ?? null;
  }

  if (engine === "mysql") {
    const setClause = columns.map((c) => `${quoteIdent(engine, c)} = ?`).join(", ");
    const [result] = await mysqlPool.query(`UPDATE ${table} SET ${setClause} WHERE ${pkCol} = ?`, [...params, id]);
    if ((result as ResultSetHeader).affectedRows === 0) return null;
    return getRecord(engine, collection, id);
  }

  const setClause = columns.map((c) => `${quoteIdent(engine, c)} = ?`).join(", ");
  const info = sqliteDb.prepare(`UPDATE ${table} SET ${setClause} WHERE ${pkCol} = ?`).run(...toSqliteParams(params), id);
  if (info.changes === 0) return null;
  return getRecord(engine, collection, id);
}

export async function deleteRecord(engine: EngineName, collection: string, id: string): Promise<boolean> {
  const schema = await getTableSchema(engine, collection);
  const pk = requirePrimaryKey(schema);
  const table = quoteIdent(engine, collection);
  const pkCol = quoteIdent(engine, pk);

  if (engine === "postgres") {
    const result = await pgPool.query(`DELETE FROM ${table} WHERE ${pkCol} = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
  if (engine === "mysql") {
    const [result] = await mysqlPool.query(`DELETE FROM ${table} WHERE ${pkCol} = ?`, [id]);
    return (result as ResultSetHeader).affectedRows > 0;
  }
  const info = sqliteDb.prepare(`DELETE FROM ${table} WHERE ${pkCol} = ?`).run(id);
  return info.changes > 0;
}
