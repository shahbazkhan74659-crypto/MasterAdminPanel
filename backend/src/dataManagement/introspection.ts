import { pgPool, mysqlPool, sqliteDb, type EngineName } from "../sqlConsole/connections.js";
import { listPostgresTables, listMysqlTables, listSqliteTables } from "../sqlConsole/adapters.js";
import { mapNativeType, applySpecialType, type BaseType, type SpecialType } from "./fieldTypes.js";

export interface FieldSchema {
  name: string;
  nativeType: string;
  baseType: BaseType;
  specialType: SpecialType;
  relationTarget?: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  required: boolean;
}

export interface CollectionSchema {
  engine: EngineName;
  collection: string;
  primaryKey: string | null;
  primaryKeyColumns: string[];
  supportsRecordOperations: boolean;
  fields: FieldSchema[];
}

export async function listCollections(engine: EngineName): Promise<string[]> {
  switch (engine) {
    case "postgres":
      return listPostgresTables(pgPool);
    case "mysql":
      return listMysqlTables();
    case "sqlite":
      return listSqliteTables();
  }
}

interface RawColumn {
  name: string;
  nativeType: string;
  columnType?: string;
  nullable: boolean;
}

async function getPostgresColumns(collection: string): Promise<RawColumn[]> {
  const result = await pgPool.query<{ column_name: string; data_type: string; is_nullable: string }>(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
    [collection]
  );
  return result.rows.map((r) => ({ name: r.column_name, nativeType: r.data_type, nullable: r.is_nullable === "YES" }));
}

async function getPostgresPrimaryKey(collection: string): Promise<string[]> {
  const result = await pgPool.query<{ column_name: string }>(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = $1`,
    [collection]
  );
  return result.rows.map((r) => r.column_name);
}

async function getMysqlColumns(collection: string): Promise<RawColumn[]> {
  const [rows] = await mysqlPool.query(
    "SELECT column_name AS column_name, data_type AS data_type, is_nullable AS is_nullable, column_type AS column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position",
    [collection]
  );
  return (rows as Array<{ column_name: string; data_type: string; is_nullable: string; column_type: string }>).map((r) => ({
    name: r.column_name,
    nativeType: r.data_type,
    columnType: r.column_type,
    nullable: r.is_nullable === "YES",
  }));
}

async function getMysqlPrimaryKey(collection: string): Promise<string[]> {
  const [rows] = await mysqlPool.query(
    "SELECT column_name AS column_name FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = 'PRIMARY'",
    [collection]
  );
  return (rows as Array<{ column_name: string }>).map((r) => r.column_name);
}

function getSqliteColumnsAndPk(collection: string): { columns: RawColumn[]; primaryKey: string[] } {
  const rows = sqliteDb.prepare(`PRAGMA table_info("${collection}")`).all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;
  const pkRows = rows.filter((r) => r.pk > 0).sort((a, b) => a.pk - b.pk);
  return {
    columns: rows.map((r) => ({ name: r.name, nativeType: r.type, nullable: r.notnull === 0 })),
    primaryKey: pkRows.map((r) => r.name),
  };
}

export async function getTableSchema(engine: EngineName, collection: string): Promise<CollectionSchema> {
  const knownCollections = await listCollections(engine);

  let rawColumns: RawColumn[];
  let primaryKeyColumns: string[];

  if (engine === "postgres") {
    rawColumns = await getPostgresColumns(collection);
    primaryKeyColumns = await getPostgresPrimaryKey(collection);
  } else if (engine === "mysql") {
    rawColumns = await getMysqlColumns(collection);
    primaryKeyColumns = await getMysqlPrimaryKey(collection);
  } else {
    const result = getSqliteColumnsAndPk(collection);
    rawColumns = result.columns;
    primaryKeyColumns = result.primaryKey;
  }

  const fields: FieldSchema[] = rawColumns.map((col) => {
    const baseType = mapNativeType(engine, col.nativeType, col.columnType);
    const { specialType, relationTarget } = applySpecialType(col.name, baseType, knownCollections);
    const isPrimaryKey = primaryKeyColumns.includes(col.name);
    return {
      name: col.name,
      nativeType: col.nativeType,
      baseType,
      specialType,
      ...(relationTarget ? { relationTarget } : {}),
      nullable: col.nullable,
      isPrimaryKey,
      required: !col.nullable && !isPrimaryKey,
    };
  });

  return {
    engine,
    collection,
    primaryKey: primaryKeyColumns.length === 1 ? primaryKeyColumns[0] : null,
    primaryKeyColumns,
    supportsRecordOperations: primaryKeyColumns.length === 1,
    fields,
  };
}
