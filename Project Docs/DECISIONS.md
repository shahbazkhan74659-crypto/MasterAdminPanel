# Technical Decisions

These decisions were made during prior planning discussions, before any production code was written, originally recorded in `docs/DESIGN.md` and `docs/tech.md`. Both files were migrated into this 6-file documentation system (2026-09-08) and then deleted — their content now lives here (and in `PROJECT.md`/`ARCHITECTURE.md`) rather than in `docs/`. Where original reasoning was not captured at the time, this is marked explicitly rather than guessed.

## Decision: A shared "Content Admin API" protocol, not a per-CMS scraper

- Status: Accepted
- Date: Prior to 2026-09-07 (exact date not captured; locked as of the 2026-09-07 commit that introduced the design/tech docs)
- Context: The owner repeatedly needs an admin/CMS UI for websites they build, and was building one bespoke UI per project.
- Decision: Build one admin panel that speaks a single protocol — the Content Admin API (auth, list collections, get a collection's schema, CRUD on records, media upload/listing, search) — that any backend can implement. The panel does not know about specific CMS platforms.
- Reasoning: Avoids rebuilding a one-off admin UI per project. Two tiers of implementer are anticipated: sites the owner builds (primary v1 target, implement the contract natively) and third-party platforms like WordPress/Shopify (would need a per-platform adapter, not required for v1).
- Consequences: The API's own tech stack is a per-site decision, out of scope for this repository. No spec draft has been written yet — see `PHASES.md`/`TASKS.md`.

## Decision: Schema-driven forms are the load-bearing design piece

- Status: Accepted
- Date: Same planning period as above
- Context: For one UI to render editors for arbitrary content types across arbitrary sites, the panel needs to know each field's shape without per-site custom frontend code.
- Decision: The Content Admin API must describe its own schema (field name, type, validation, relations) so the panel can generate the appropriate input (text, rich text, image picker, relation dropdown, date, boolean, array, etc.) generically.
- Reasoning: The same trick LSP uses to let one editor support many languages, scoped here to content administration. Get this right first — everything else (tabs, tree, palette) is UI built on top of it.
- Consequences: This is the piece implementation should prioritize getting right before other UI work — see `TASKS.md`.

## Decision: VS Code interaction metaphor for the panel's UI

- Status: Accepted
- Date: Same planning period as above
- Context: The panel needed a UI/interaction model distinct from a typical boxy CRUD admin UI.
- Decision: Model the panel visually and interactively on VS Code — activity bar (switch sites/workspaces or modules), explorer sidebar (current site's collections/records tree), editor tabs (open records, unsaved-changes dot), editor pane (schema-driven form, or Monaco for raw JSON/HTML/code fields), command palette (quick actions like "New Post"/"Publish"/"Switch Site"), status bar (connected site, environment, save/sync state), split panes (compare two records or environments).
- Reasoning: Not explicitly captured beyond the stated preference; likely follows from the owner's own familiarity with VS Code as a power-user interaction model well-suited to a tree-of-content-types + open-record-tabs structure.
- Consequences: Reusing Monaco (VS Code's real editor component, open source) for code/JSON fields and the SQL console follows directly from this metaphor — see the stack decision below.

## Decision: SQL console connects directly to the database (exception to the API protocol)

- Status: Accepted
- Date: Same planning period as above
- Context: In addition to the schema-driven CRUD path, the owner wants a dedicated SQL query console (its own tab type, VS Code database-extension-styled: table chips, query input, result grid) for personal database work.
- Decision: The SQL console bypasses the Content Admin API entirely and connects directly to the target database. Kept visibly separate (its own tab, its own icon) rather than blended into the record editor, since raw SQL bypasses schema validation and any safety the Content Admin API would otherwise enforce.
- Reasoning: Acceptable specifically because this is a personal-use tool with one trusted operator and no multi-tenant exposure — a materially different trust boundary than the generic content forms, which is why it must stay visibly distinct rather than quietly reusing the same code path.
- Consequences: This directly drove the "not a pure web app" stack constraint below (a browser cannot open a raw DB connection). **Still open, not yet decided**: whether the real implementation defaults to read-only with an explicit confirm step before non-`SELECT` statements, or stays unrestricted (acceptable for now only because it's personal-only) — do not build this without asking the owner first if it starts connecting to anything with real consequences.

## Decision: Production stack — Electron + React/TypeScript + Vite + Monaco + Zustand + native DB drivers

- Status: Accepted
- Date: Same planning period as above (locked alongside the design)
- Context: The SQL console requirement (direct DB connection) rules out a pure web app — a browser cannot open a raw TCP connection to Postgres/MySQL/SQLite. The panel needs a real backend process with native DB drivers.
- Decision:
  - Shell: **Electron** — same foundation as real VS Code; Node.js main process gets direct DB-driver access with no sidecar process needed.
  - UI: **React + TypeScript**, built with **Vite** — matches the component/state model already proven in the prototype; fast dev loop.
  - Code/SQL editing: **Monaco** — real syntax highlighting for the SQL console and any raw JSON/code fields, instead of a plain textarea.
  - State management: **Zustand** — lightweight global store for open tabs, active site, connections; no Redux ceremony needed for a solo project.
  - DB access (SQL console): **Node drivers per engine** (`pg`, `mysql2`, `better-sqlite3`) running in the Electron main process, exposed to the renderer via `contextBridge`/IPC.
  - Content Admin API client: plain `fetch` from the renderer — outbound HTTPS only, to sites the user controls.
  - Secrets (API keys, DB credentials): Electron's built-in **`safeStorage`** — OS-backed encryption, no extra native dependency (skips `keytar`). DB credentials and per-site API keys are two separate secret categories — do not conflate them.
  - Local app state (layout, recent sites, open tabs): **electron-store** — simple JSON persistence for non-secret settings only.
  - Packaging: **electron-builder** — produces a Windows installer for the primary dev machine.
- Reasoning: Everything follows from the direct-DB-connection constraint; see per-row rationale above.
- Consequences: This resolves the "Runtime: local desktop app vs. web app styled to look like VS Code" question that the original design record had listed as open — Electron (a local desktop app) is the settled answer, not a web app. No implementation exists yet against this stack — see `PHASES.md`, `ARCHITECTURE.md`.

## Decision: Reject Tauri as the shell

- Status: Accepted (rejected alternative)
- Date: Same planning period as above
- Context: Tauri (Rust backend + OS webview) was considered for its smaller binary size and lower memory use, as an alternative to Electron.
- Decision: Rejected.
- Reasoning: The SQL console's DB layer would either need a Rust rewrite (`sqlx`) or a Node sidecar process anyway under Tauri, adding complexity without a clear payoff for a personal, single-user tool where dev speed matters more than binary size.
- Consequences: Revisit only if resource usage becomes a real practical problem — not expected to be reopened otherwise.

## Decision: Build a visual design canvas prototype before production implementation

- Status: Accepted (observed via existing artifact)
- Date: 2026-09-07 (commit `90a90b4`)
- Context: The owner wanted to validate the VS Code-metaphor UI design interactively before committing to a build.
- Decision: Publish a Claude Design canvas (`design/master-admin-panel.html`, source `design/Main.dc.html`/`design/canvas.json`) as a mock frontend — no real API calls, no real DB connection, no backend.
- Reasoning: Validates the UI/interaction design against the locked product concept before real implementation effort begins.
- Consequences: This prototype is a design/validation reference only, the same way Portfolio's `prototype/index.html` was a styling reference only for that project — it is not expected to be ported into or reused as production code. No decision has been recorded either way on reuse, since production implementation hasn't started; treat "prototype is reference only, not to be ported" as the working assumption unless the owner says otherwise when implementation begins.

## Open decisions (not yet made)

Carried forward from the original design record — do not treat any of these as settled:

- **Spec-first vs. site-first**: lock down the full Content Admin API spec before building anything, or start from one real existing site and generalize the contract from what it actually needs.
- **Auth/secrets storage scoping**: `safeStorage` is chosen as the storage mechanism (see stack decision above), but exactly how per-site API keys/tokens and per-site DB credentials get scoped/organized (e.g. one vault entry per site vs. per connection) is not yet decided.
- **Versioning/history**: whether records get git-like diff/version history in the editor pane.
- **SQL console write safety**: read-only-by-default vs. unrestricted (see the SQL console decision above).
