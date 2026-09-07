# Master Admin Panel — Design Discussion

Status: **LOCKED**. The UI, interaction model, and core architecture below are approved and
validated against a working prototype. This is the reference design for implementation — changes
to anything in this doc should be deliberate, not incidental. No production code has been written
yet; the prototype is a mock frontend only (see "Prototype" below).

Prototype: https://claude.ai/code/artifact/e9b18b50-dd06-4c09-a520-e79a1f2136c8

## What this is

A single admin panel, personal-use, that can manage content on any website — as long as that
website's backend implements a shared API contract. Instead of building a one-off admin UI per
project, you build this panel once, and every future site exposes the same "Content Admin API"
so the panel can manage it.

Visually and interactively, the panel is modeled on the **VS Code** interface (tree explorer,
tabs, command palette, status bar) rather than a typical boxy CRUD admin UI.

## Core idea: a protocol, not a scraper

The panel does not know about specific CMS platforms (WordPress, Shopify, etc.). It only knows
how to speak one contract — a **Content Admin API** — which any backend can implement:

- Auth (get a session/token)
- List collections (content types available on this site)
- Get a collection's schema (field names, types, validation, relations)
- CRUD on records within a collection
- Media upload / listing
- Search

Because the schema itself is served by the API (not hardcoded per site), the panel can render
the right editor for any content type without site-specific frontend code. This is the same
trick LSP uses to let one editor support many languages — scoped here to content administration.

## Two tiers of "any website"

1. **Sites you build** — implement the Content Admin API natively. This is the primary target
   and where the effort should go first.
2. **Third-party platforms** (WordPress, Shopify, etc.) — would need a per-platform adapter that
   translates their native API into the Content Admin API contract. Not required for v1;
   revisit later if needed.

## UI: VS Code metaphor mapping

| VS Code element | Admin Panel meaning |
|---|---|
| Activity bar (far-left icons) | Switch between connected sites/workspaces, or between modules (Content / Media / Users / Settings) |
| Explorer sidebar (tree) | Current site's collections and records |
| Editor tabs | Open records, each with an unsaved-changes dot |
| Editor pane | The content form for the open record; could reuse **Monaco** (VS Code's actual editor component, open source) for raw JSON/HTML/code fields |
| Command palette (Ctrl+Shift+P) | Quick actions — "New Post," "Publish," "Switch Site," "Duplicate Record" |
| Status bar | Connected site, environment (staging/prod), save/sync state |
| Split panes | Compare two records, or the same record across environments |

## The load-bearing decision: schema-driven forms

For one UI to render editors for arbitrary content types, the API must describe its own schema
(field name, type, validation, relations) so the panel can generate the appropriate input
(text, rich text, image picker, relation dropdown, date, boolean, array, etc.) without
per-site custom frontend code.

This is the piece to get right first — everything else (tabs, tree, palette) is UI built on
top of it.

## SQL console (direct DB access)

In addition to the schema-driven CRUD forms, the panel has a dedicated **SQL query console** —
its own tab type (distinct icon, opened per-site), styled after VS Code's database-extension
UX: clickable table chips, a query input, and a real result grid (columns/rows, row count,
elapsed time), reachable via a sidebar icon or the command palette.

This is a deliberate, explicit exception to the "protocol, not a scraper" model above:

- **Decision**: since this tool is personal-use only, the SQL console connects **directly to
  the database** — it does not go through the Content Admin API contract. This is acceptable
  specifically because there is one trusted operator and no multi-tenant exposure.
- **Why it's kept separate from the CRUD path**: raw SQL bypasses schema validation and any
  safety the Content Admin API would otherwise enforce. It is a materially different trust
  boundary than the generic content forms, so it should stay visibly a separate mode
  (its own tab, its own icon) rather than blended into the record editor.
- **Flagged, not yet decided**: whether the real implementation defaults to read-only with an
  explicit confirm step before non-`SELECT` statements. Left open/unrestricted for now since
  this is personal-only, but worth deciding deliberately before connecting to anything with
  real consequences (production data, anything ever exposed beyond one operator).

## Open decisions (not yet made)

- **Runtime**: local desktop app (Electron/Tauri, truly native VS Code feel) vs. a web app
  styled to look like VS Code.
- **Spec-first vs. site-first**: lock down the Content Admin API spec before building anything,
  or start from one real existing site and generalize the contract from what it needs.
- **Auth/secrets storage**: how per-site API keys/tokens get stored (local encrypted vault,
  since this is a personal multi-site tool), and separately, how DB credentials for the SQL
  console get stored/scoped per site.
- **Versioning/history**: whether records get git-like diff/version history in the editor pane.
- **SQL console write safety**: read-only-by-default vs. unrestricted (see above).

## Next step

Design is locked; implementation hasn't started. Likely candidates to start real build work:
(a) writing a first draft of the Content Admin API spec, or (b) picking one existing site to
retrofit as the first implementer of the contract and wiring a real DB connection for its SQL
console.
