# Content Admin API — Specification

**Status: Formalized 2026-09-09 ([Phase 9]).** This document specifies the request/response contract actually implemented by AdminPanel's backend in `backend/src/dataManagement/` (mounted at `/data-api`) and `backend/src/auth/` (mounted at `/auth-api`) — written from the working code, not designed speculatively.

## Scope note — read this before anything else

The original product concept (`PROJECT.md`) describes the Content Admin API as a protocol **any backend can implement**, called by the panel as an HTTP client against **remote sites**. That two-party relationship does not exist today. What actually got built ([Phase 6], [Phase 7]) is different:

- `/data-api/*` runs **inside AdminPanel's own backend** and reads/writes **AdminPanel's own locally-reachable databases** (the three [Phase 1b] target engines) via direct SQL introspection — it never makes an HTTP call to a remote site's backend.
- `/auth-api/*` is AdminPanel's **own single-operator login** (a session cookie for the panel's owner) — not a token/key a remote site would issue to authenticate the panel as its client.
- The only piece of this project that reaches a genuinely separate site's own database is [Phase 7]'s extension of the **SQL console** (`/sql-console-api/sites/:siteId`) — and that is raw SQL, a deliberate exception to this schema-driven path, not this contract.
- **Search** (a named capability in the original design) and **media listing** were never built.

So this document is **the real, working schema/CRUD contract** — genuinely useful as a template for what a remote implementer would need to expose — but it describes AdminPanel's internal API surface for its own local databases, not a proven client/server integration with any external site. See `DECISIONS.md`'s "Phase 9 spec documents AdminPanel's actual internal data-api contract, not a remote-site-implemented protocol" entry for the full reasoning. Every capability below is tagged with its real status:

| Tag | Meaning |
|---|---|
| ✅ Implemented | Working code exists and is verified, exactly as documented below. |
| ❌ Not implemented | No code exists for this. Documented here only because the original design named it as an intended capability. |

## Conventions used throughout

- Base path: `/data-api` for schema/CRUD/media, `/auth-api` for login (separate mount, see below).
- `:engine` is one of `postgres`, `mysql`, `sqlite` — the three [Phase 1b] local target databases. **Not** a remote site id (contrast with the separate `/sql-console-api/sites/:siteId` path, which is out of this spec's scope).
- Every response is JSON with an `ok: boolean` field. On failure: `{ "ok": false, "error": "<message>" }`.
- No route documented here requires authentication yet — session-gating every route is [Phase 24]'s job, not done as of this writing.
- HTTP status codes used: `200`/`201` success, `400` bad input (unknown engine/collection/field, failed validation, unsupported operation on a table with no usable primary key), `404` record or field not found, `500` unexpected/driver error.

## 1. Authentication — ✅ Implemented (owner-only, not a per-site mechanism)

Mounted at `/auth-api`. This is the single owner's login to the panel itself, built in [Phase 4] — it has no relationship to how a remote site's own Content Admin API implementation would authenticate the panel as a client (that mechanism — likely API keys/tokens, per `PROJECT.md`'s original capability list — is ❌ not implemented and not assigned to any phase beyond the general note in [Phase 10] "Secrets Storage Mechanism").

### `POST /auth-api/login`
Request body: `{ "username": string, "password": string }`
- `400` if either field is missing/non-string.
- `401` `{ ok: false, error: "Invalid username or password" }` on bad credentials.
- `200` `{ ok: true, username: string }` on success, plus a `Set-Cookie: adminpanel.sid=...` (httpOnly, `SameSite=Lax`, 8-hour expiry; `secure: false` in local dev — see `DECISIONS.md`'s login-mechanics entry for the required Phase 30 change).

### `POST /auth-api/logout`
No body. Destroys the server-side session and clears the cookie. Always `200 { ok: true }`.

### `GET /auth-api/me`
No body. `{ authenticated: true, username: string }` if a valid session cookie is present, else `{ authenticated: false }`. Always `200`.

## 2. Collections — ✅ Implemented (local engines only)

### `GET /data-api/:engine/collections`
Lists every table AdminPanel can see in that engine's configured database (via `information_schema` for Postgres/MySQL, `sqlite_master`-equivalent listing for SQLite).

Response: `{ "ok": true, "collections": string[] }` — one entry per real table name, no filtering.

`400` if `:engine` isn't one of `postgres`/`mysql`/`sqlite`.

## 3. Schema — ✅ Implemented, auto-introspected

### `GET /data-api/:engine/:collection/schema`
Schema is never hand-authored — it's derived live from the database's real columns each request (see `DECISIONS.md`'s "Data management schema via auto-introspection" entry).

`400` if `:engine` is unknown or `:collection` isn't in that engine's real table list.

Response shape (`CollectionSchema`):
```json
{
  "ok": true,
  "engine": "postgres | mysql | sqlite",
  "collection": "string",
  "primaryKey": "string | null",
  "primaryKeyColumns": ["string", "..."],
  "supportsRecordOperations": true,
  "fields": [ /* FieldSchema, see below */ ]
}
```

- `primaryKey` is the single-column primary key name, or `null` if the table has zero or more than one PK column.
- `supportsRecordOperations` is `true` only when there is exactly one PK column. When `false`, `GET/PATCH/DELETE .../records/:id` all reject with `400` (`collection` has no primary key, or a composite one — Phase 6 only supports single-column primary keys).

### `FieldSchema`
```json
{
  "name": "string",
  "nativeType": "string",
  "baseType": "text | integer | float | boolean | date | other",
  "specialType": "richtext | image | video | relation | null",
  "relationTarget": "string (present only when specialType is \"relation\")",
  "nullable": true,
  "isPrimaryKey": false,
  "required": true
}
```

- `nativeType` is the raw driver-reported column type (e.g. Postgres `character varying`, MySQL `tinyint`, SQLite's free-text declared type).
- `baseType` is `nativeType` normalized into one of six buckets (`mapNativeType` in `backend/src/dataManagement/fieldTypes.ts`). Engine-specific quirks: MySQL `tinyint(1)` maps to `boolean`, any other `tinyint` maps to `integer`; SQLite has no native boolean/date type, so a declared type must contain a recognizable substring (`bool`, `int`, `real`/`float`/etc.) or it falls to `other`.
- `required` is `true` only for non-nullable, non-primary-key columns — this is what create-time validation enforces as mandatory.

### Special field types — naming convention, not a config file
A column's **name** (not its SQL type) signals four extra field types no native SQL type can express. The suffix is stripped from nothing — the column keeps its real name; the suffix only triggers special-type tagging:

| Suffix | `specialType` | Required `baseType` | Extra behavior |
|---|---|---|---|
| `_richtext` | `richtext` | `text` | none |
| `_image` | `image` | `text` | column stores a served media path (see §5) |
| `_video` | `video` | `text` | column stores a served media path (see §5) |
| `_id_relation` | `relation` | `integer` or `text` | `relationTarget` resolved by trying `<stem>`, `<stem>s`, `<stem>es` (stem = column name minus the suffix) against the engine's real table list |

If the suffix matches but the base type is incompatible, or (for `_id_relation`) none of the three candidate names is a real table, the suffix is **ignored** — the field falls back to `specialType: null` with its plain `baseType`, and a warning is logged server-side. This never errors the request.

## 4. Records — ✅ Implemented (create/read/update/delete)

All four operations require `supportsRecordOperations: true` (see §3) except listing, which works on any table.

### `GET /data-api/:engine/:collection/records`
Query params: `limit` (default `100`, capped at `1000`), `offset` (default `0`). Ordered by the primary key when one exists, unordered otherwise.

Response: `{ "ok": true, "records": [...], "rowCount": number, "limit": number, "offset": number }` — `rowCount` is the count of rows returned in this page, not a total-table count.

### `GET /data-api/:engine/:collection/records/:id`
`{ "ok": true, "record": {...} }` or `404` if no row matches the primary key.

### `POST /data-api/:engine/:collection/records`
Body: `{ "values": { "<field>": <value>, ... } }`.
- `400` if `values` is missing/not a plain object.
- Validated against the schema (see §4.1 below); on success, `201 { "ok": true, "record": {...} }` with the newly-created row (including any DB-generated defaults/serial id).

### `PATCH /data-api/:engine/:collection/records/:id`
Same body shape as create, but only the supplied fields are updated (no full-record replace semantics). `200 { "ok": true, "record": {...} }` with the row **after** the update, or `404` if `:id` doesn't exist.

### `DELETE /data-api/:engine/:collection/records/:id`
No body. `200 { "ok": true }` on success, `404` if `:id` doesn't exist.

### 4.1 Validation rules (`backend/src/dataManagement/validation.ts`)
Applied to every `values` object on create/update, against the collection's live-introspected schema:
- Any key not matching a real field name → `400` `"Unknown field(s): ..."`.
- The primary key column may never be set via `values` → `400`.
- On **create only**: every `required` field (non-nullable, non-PK) must be present → `400 "Missing required field(s): ..."` if not.
- `null` is rejected for any field where `nullable` is `false` → `400`.
- Every non-null value is **coerced** to its field's `baseType`, or rejected:
  - `text` — must already be a `string`.
  - `boolean` — accepts a real boolean, or the literal strings `"true"`/`"false"`; anything else rejects.
  - `integer` — coerced via `Number(value)`, rejected if not an integer (empty string also rejected).
  - `float` — coerced via `Number(value)`, rejected if `NaN`.
  - `date` — must be a string parseable by `Date.parse` (i.e. a valid ISO-8601-ish date string).
  - `other` — passed through unchanged, no validation.

## 5. Media upload (Image / Video fields) — ✅ Implemented; ❌ media *listing* not implemented

### `POST /data-api/:engine/:collection/records/:id/upload/:field`
A **single request** does upload + record update — there is no separate "upload, get a path, then PATCH" flow. Multipart form, one file under the field name `file`.

- `400` if `:field` isn't a real column tagged `specialType: "image"` or `"video"` on that collection.
- `404` if `:id` doesn't exist.
- File constraints, enforced by `multer` (`backend/src/dataManagement/upload.ts`):
  - Image: allowed extensions `.jpg .jpeg .png .gif .webp`, max 10 MB, MIME type must start with `image/`.
  - Video: allowed extensions `.mp4 .webm .mov`, max 200 MB, MIME type must start with `video/`.
  - A mismatched MIME type causes `multer` to silently drop the file rather than throwing — the route then returns `400 "Uploaded file does not match the field's expected type"`.
  - The stored filename is always server-generated (`<timestamp>-<uuid><ext>`) — the client's original filename is never used for storage, only to detect the extension.
- Storage path: `backend/media/<engine>/<collection>/<field>/<generated-filename>` (gitignored). Served at `/media/<engine>/<collection>/<field>/<generated-filename>`.
- On success: `201 { "ok": true, "field": string, "path": "/media/...", "record": {...} }` — `record` is the full row **after** the field was updated to the new served path.
- Re-uploading to a field that already holds a path leaves the previous file on disk — no cleanup/orphan deletion (see `DECISIONS.md`, a deliberate current limitation).

There is no endpoint to list, browse, or search previously-uploaded media — only per-record upload/overwrite via the route above.

## 6. Search — ❌ Not implemented

`PROJECT.md`/`DECISIONS.md` name search as a Content Admin API capability. No search endpoint, index, or query parameter exists anywhere in `/data-api`. This remains open — not assigned to any phase in the locked [Phase 0–31] roadmap beyond its mention as an intended capability.

## 7. Error envelope reference

Every endpoint in this document uses the same shape on failure:
```json
{ "ok": false, "error": "human-readable message" }
```
| Status | Meaning |
|---|---|
| `400` | Bad input: unknown engine, unknown collection, malformed `values`, failed field validation, or an operation requiring a usable primary key on a table that doesn't have one. |
| `401` | (Login only) Invalid credentials. |
| `404` | Record or upload target not found. |
| `500` | Unexpected error — typically a raw driver error surfaced via `String(err)`, not a structured message. |

## What this document is not

- Not a guide for connecting a real, separate website's backend to this contract — no such integration has ever been built or tested (see the Scope note above).
- Not the SQL Console's contract (`/sql-console-api/*`) — that is a deliberately separate, unrestricted raw-SQL path (see `DECISIONS.md`'s "SQL console connects directly to the database" decision), out of scope for the Content Admin API.
- Not a guarantee of stability — every shape above reflects the code as of [Phase 6]/[Phase 7]/[Phase 8]; if that code changes materially, this document needs a follow-up update to stay accurate (per `CLAUDE.md` rule 9).
