// Shared schema/record types + helpers used by both AppShell.tsx and
// editorFields.tsx -- pulled out to a leaf module so the two don't import
// runtime functions from each other (AppShell renders via editorFields;
// editorFields needs labelFor(), which previously lived in AppShell).

export type Values = Record<string, unknown>

export interface FieldSchema {
  name: string
  baseType: string
  specialType: string | null
  relationTarget?: string
  nullable: boolean
  required: boolean
  isPrimaryKey: boolean
}

export interface CollectionSchema {
  primaryKey: string | null
  fields: FieldSchema[]
}

// Shared by tree rows, tab labels, and relation-dropdown option labels --
// deliberately simple, not clever.
export function labelFor(collection: string, record: Values, schema: CollectionSchema): string {
  if (typeof record.title === 'string' && record.title) return record.title
  if (typeof record.name === 'string' && record.name) return record.name
  const pk = schema.primaryKey
  return `${collection} #${pk ? String(record[pk] ?? '') : ''}`
}
