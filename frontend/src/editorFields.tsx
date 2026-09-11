import Editor from '@monaco-editor/react'
import type { CollectionSchema, FieldSchema, Values } from './schemaTypes'
import { labelFor } from './schemaTypes'

// Populated lazily from AppShell's existing `collectionData` cache (Phase 24b) --
// reused as-is for relation dropdowns so an already-expanded explorer-tree
// collection needs no second fetch. 'loading'/'error' mirror that cache's own
// CollectionEntry states.
export interface RenderCtx {
  relationRecords?: Values[] | 'loading' | 'error'
  relationSchema?: CollectionSchema
}

// Phase 24c: real, schema-driven per-field rendering, replacing Phase 24b's
// unconditional readOnly text input for every field regardless of type.
// Dispatches on specialType first (relation/image/video/richtext all need
// something other than their raw baseType's default widget), then baseType.
export function renderFieldInput(
  field: FieldSchema,
  value: unknown,
  onChange: (next: unknown) => void,
  ctx: RenderCtx = {},
  forceDisabled = false, // used by the split/compare view's read-only "Production" pane
) {
  const disabled = forceDisabled || field.isPrimaryKey // visible, never editable

  if (field.specialType === 'relation') {
    return renderRelationSelect(field, value, onChange, ctx, disabled)
  }

  // Confirmed decision (2026-09-11): image/video fields are read-only path
  // display only in this phase -- the real picker/upload UI is Phase 27's job,
  // and today's upload endpoint writes straight to the live DB, bypassing the
  // draft/staging layer entirely, so a staged text-edit of the path would imply
  // a save/deploy semantic that doesn't actually work end-to-end yet.
  if (field.specialType === 'image' || field.specialType === 'video') {
    return (
      <input
        className="input"
        type="text"
        value={value === null || value === undefined || value === '' ? '(none)' : String(value)}
        disabled
        readOnly
      />
    )
  }

  // Confirmed decision: richtext stays a plain textarea in this phase -- Monaco
  // is scoped to baseType 'other' ("code/JSON fields") only, not long-form text.
  if (field.specialType === 'richtext') {
    return (
      <textarea
        className="textarea"
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  switch (field.baseType) {
    case 'boolean':
      return renderToggle(value, onChange, disabled)
    case 'date':
      return (
        <input
          className="input"
          type="date"
          value={value ? String(value).slice(0, 10) : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'integer':
    case 'float':
      return (
        <input
          className="input"
          type="number"
          step={field.baseType === 'float' ? 'any' : 1}
          value={value === null || value === undefined ? '' : String(value)}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return onChange(null)
            onChange(field.baseType === 'integer' ? parseInt(raw, 10) : parseFloat(raw))
          }}
        />
      )
    case 'other':
      return renderJsonField(value, onChange, disabled)
    case 'text':
    default:
      return (
        <input
          className="input"
          type="text"
          value={value === null || value === undefined ? '' : String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function renderToggle(value: unknown, onChange: (next: unknown) => void, disabled: boolean) {
  const on = Boolean(value)
  return (
    <button
      type="button"
      className={`toggle${on ? ' on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      <span className="toggle-knob"></span>
    </button>
  )
}

// Confirmed decision: minimal Monaco, scoped to baseType 'other' fields only
// (unrecognized/untyped native columns, e.g. a Postgres jsonb column) -- full
// Monaco configuration everywhere is Phase 25's separate job.
function renderJsonField(value: unknown, onChange: (next: unknown) => void, disabled: boolean) {
  let text: string
  let isJson = true
  try {
    text = JSON.stringify(value ?? null, null, 2)
  } catch {
    // 'other' means "unrecognized native type," not guaranteed-JSON -- don't
    // force a JSON editor on a value that doesn't even round-trip through
    // JSON.stringify (e.g. a bigint or other exotic driver-returned value).
    text = String(value ?? '')
    isJson = false
  }

  if (!isJson) {
    return (
      <textarea
        className="textarea"
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  return (
    <div className="monaco-field-wrap">
      <Editor
        height="160px"
        defaultLanguage="json"
        value={text}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          lineNumbers: 'off',
          folding: false,
          scrollBeyondLastLine: false,
        }}
        onChange={(next) => {
          // baseType 'other' is a pure pass-through on the backend
          // (validation.ts's coerceValue returns the value unchanged for
          // 'other') -- send the PARSED value so it round-trips as real JSON,
          // not a JSON-encoded string. Invalid mid-edit JSON is ignored,
          // leaving the last-valid staged value in place until it parses again.
          try {
            onChange(JSON.parse(next ?? 'null'))
          } catch {
            /* invalid JSON mid-edit -- keep last-valid staged value */
          }
        }}
      />
    </div>
  )
}

// Confirmed decision: a real <select> of the target collection's actual
// records, reusing labelFor() for option text and whatever page the existing
// GET /:engine/:collection/records endpoint returns (no new pagination/search).
function renderRelationSelect(
  field: FieldSchema,
  value: unknown,
  onChange: (next: unknown) => void,
  ctx: RenderCtx,
  disabled: boolean,
) {
  const entry = ctx.relationRecords
  if (entry === undefined || entry === 'loading') {
    return (
      <select className="select" disabled>
        <option>Loading…</option>
      </select>
    )
  }
  if (entry === 'error' || !ctx.relationSchema) {
    return (
      <select className="select" disabled>
        <option>Unable to load related records</option>
      </select>
    )
  }
  const targetSchema = ctx.relationSchema
  const pkName = targetSchema.primaryKey
  return (
    <select
      className="select"
      value={value === null || value === undefined ? '' : String(value)}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
    >
      <option value="">—</option>
      {entry.map((record) => {
        const pk = pkName ? String(record[pkName] ?? '') : JSON.stringify(record)
        return (
          <option key={pk} value={pk}>
            {labelFor(field.relationTarget ?? '', record, targetSchema)}
          </option>
        )
      })}
    </select>
  )
}
