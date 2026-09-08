# Technical Decisions

These decisions were made during prior planning discussions, before any production code was written, originally recorded in `docs/DESIGN.md` and `docs/tech.md`. Both files were migrated into this 6-file documentation system (2026-09-08) and then deleted — their content now lives here (and in `PROJECT.md`/`ARCHITECTURE.md`) rather than in `docs/`. Where original reasoning was not captured at the time, this is marked explicitly rather than guessed.

## Decision: A shared "Content Admin API" protocol, not a per-CMS scraper

- Status: Accepted
- Date: Prior to 2026-09-07 (exact date not captured; locked as of the 2026-09-07 commit that introduced the design/tech docs)
- Context: The owner repeatedly needs an admin/CMS UI for websites they build, and was building one bespoke UI per project.
- Decision: Build one admin panel that speaks a single protocol — the Content Admin API (auth, list collections, get a collection's schema, CRUD on records, media upload/listing, search) — that any backend can implement. The panel does not know about specific CMS platforms.
- Reasoning: Avoids rebuilding a one-off admin UI per project. Two tiers of implementer are anticipated: sites the owner builds (primary v1 target, implement the contract natively) and third-party platforms like WordPress/Shopify (would need a per-platform adapter, not required for v1).
- Consequences: The API's own tech stack is a per-site decision, out of scope for this repository. No spec draft has been written yet — see `PHASES.md`/`TASKS.md`.

## Decision: Site-first, not spec-first — build the Content Admin API before formally documenting its spec

- Status: Accepted (resolved by roadmap ordering)
- Date: 2026-09-08
- Context: The original design record left open whether to lock down the full Content Admin API spec before building anything ("spec-first") or start from one real implementation and generalize the contract from what it actually needs ("site-first").
- Decision: The roadmap (`PHASES.md`) orders Phase 6 (Data Management System engine) and Phase 7 (Content Admin API implementation) before Phase 9 (writing the formal spec document) — resolving the question in favor of **site-first**.
- Reasoning: Owner's phase ordering when defining the roadmap; not separately argued, but the practical effect is that the spec gets written from a real, working implementation rather than designed speculatively up front.
- Consequences: Phase 9's spec document must describe what Phase 6/7 actually built, not aspirational behavior — see `CLAUDE.md` rule 9. If Phase 6/7's implementation changes significantly after Phase 9, the spec document will need a follow-up update to stay accurate.

## Decision: Schema-driven forms are the load-bearing design piece

- Status: Accepted
- Date: Same planning period as above
- Context: For one UI to render editors for arbitrary content types across arbitrary sites, the panel needs to know each field's shape without per-site custom frontend code.
- Decision: The Content Admin API must describe its own schema (field name, type, validation, relations) so the panel can generate the appropriate input (text, rich text, image picker, relation dropdown, date, boolean, array, etc.) generically.
- Reasoning: The same trick LSP uses to let one editor support many languages, scoped here to content administration. Get this right first — everything else (tabs, tree, palette) is UI built on top of it.
- Consequences: This is the piece implementation should prioritize getting right before other UI work — see `TASKS.md`.

## Decision: Image and Video as real schema field types (backend), with dedicated frontend UI

- Status: Accepted
- Date: 2026-09-08
- Context: A review of the original design surfaced a gap — "media upload/listing" was named as a Content Admin API capability, and "image picker" was mentioned narratively as a schema-driven form field type, but neither had any real backend field-type support or dedicated frontend UI scheduled anywhere in the roadmap. No video support was mentioned at all.
- Decision: Image and Video are real field types in the backend content-editing logic ([Phase 6] "Data Management System Backend," alongside the existing text/rich-text/relation/date/boolean/array types) — storing/retrieving image and video field values as part of a record's schema and CRUD flow. The corresponding frontend picker/upload/preview UI is separately scoped to [Phase 26] "Image and Video Field UI (Frontend)."
- Reasoning: Owner's explicit direction, closing a real gap between what the design narratively implied (media handling, an "image picker") and what was actually scheduled to be built (nothing).
- Consequences: A dedicated media library/browser UI (a gallery/grid of uploaded media, search/filter, delete) is still **not** scheduled — Phase 6/26 cover per-record Image/Video *fields*, not a standalone media management surface. How much real editing logic Phase 26 includes (upload/preview/replace only, vs. actual crop/trim-style editing) is not yet decided — see `PHASES.md`'s Phase 26 entry.

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
- **Refinement (2026-09-08, Phase 7 planning — see `PHASES.md`):** "connects directly to the target database" covers two cases, not one. For a locally-reachable database (e.g. Phase 1's local Postgres/MySQL/SQLite), the console's backend driver opens a real direct connection, no intermediary. For a real remote website's database that isn't directly network-reachable by the panel, Phase 7's **Content Admin API** implementation is the bridging mechanism — the console's queries get routed through that site's own API server to reach its database. This is still the same trust boundary as "direct" access (unrestricted raw SQL, no schema validation) — it is *not* the schema-driven CRUD path — just carried over a different transport when a raw TCP path isn't available. Do not confuse this bridging role with the Content Admin API's original schema-driven CRUD purpose; a single site's Content Admin API implementation may end up serving both purposes (CRUD forms and raw SQL bridging) but they remain conceptually distinct capabilities.

## Decision: Production stack — Electron + React/TypeScript + Vite + Monaco + Zustand + native DB drivers

- Status: **Superseded** (2026-09-08) — see "Browser-based web app, not an Electron desktop shell" below.
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
- Consequences: This resolved the "Runtime: local desktop app vs. web app styled to look like VS Code" question that the original design record had listed as open — in favor of Electron. **Reversed 2026-09-08** — see "Browser-based web app, not an Electron desktop shell" below. No implementation was ever built against this stack, so nothing needs unwinding in code.

## Decision: Reject Tauri as the shell

- Status: **Superseded** (2026-09-08) — moot now that the shell itself (Electron) is superseded; kept here as a historical record of the reasoning, since a Rust/Tauri shell could resurface as an alternative if the browser-based direction is ever reversed again.
- Date: Same planning period as above
- Context: Tauri (Rust backend + OS webview) was considered for its smaller binary size and lower memory use, as an alternative to Electron.
- Decision: Rejected.
- Reasoning: The SQL console's DB layer would either need a Rust rewrite (`sqlx`) or a Node sidecar process anyway under Tauri, adding complexity without a clear payoff for a personal, single-user tool where dev speed matters more than binary size.
- Consequences: Revisit only if resource usage becomes a real practical problem — not expected to be reopened otherwise.

## Decision: Browser-based web app, not an Electron desktop shell

- Status: Accepted
- Date: 2026-09-08
- Context: The owner decided to run the panel as a browser-based site rather than an installed Electron desktop app, superseding the earlier Electron/Tauri-shell decision above. This does not remove the original constraint that drove that decision — a browser still cannot open a raw TCP connection to Postgres/MySQL/SQLite for the SQL console — it moves where that constraint is satisfied: a real backend server process now holds the native DB drivers (still `pg`/`mysql2`/`better-sqlite3`, still Node.js) and the browser talks to it over HTTP/WebSocket instead of an Electron main process talked to over IPC.
- Decision: Build the panel as a client (React + TypeScript, Vite) + backend server (Node.js) web app, deployed as a hosted site rather than packaged as a desktop installer.
- Reasoning: Owner's explicit direction ("just use it as a browser based site"), prioritizing browser accessibility over an installed desktop app.
- Consequences:
  - Everything Electron-specific from the superseded stack decision no longer applies: `safeStorage` (secrets), `electron-store` (local settings), `electron-builder` (packaging), and `contextBridge`/IPC (renderer↔main communication).
  - What still carries over unchanged: React + TypeScript + Vite (frontend), Monaco (Monaco is web-native — it works in a plain browser at least as well as in Electron), Zustand (frontend state), and the `pg`/`mysql2`/`better-sqlite3` drivers (now living in a backend server instead of an Electron main process).
  - A backend server framework/runtime choice is now needed (not yet decided — see Open decisions below).
  - Secrets storage (API keys, DB credentials) needs a new server-side mechanism to replace `safeStorage` — not yet decided.
  - A new requirement that didn't exist for the desktop app: **the site needs its own authentication in front of it**. A desktop app installed only on the owner's machine was implicitly trusted because only the owner could open it; a browser-based site is reachable by anyone who has the URL unless it's gated. See the "Single-user login" decision below.
  - Hosting is decided — see the "Render free tier + UptimeRobot" decision below.

## Decision: Single-user login for now; multi-agent/admin-policy access deferred

- Status: Accepted (partial) — single login only; the admin/policy layer is a stated future direction, not designed
- Date: 2026-09-08
- Context: Going browser-based (see above) means the site needs real authentication, unlike the desktop app's implicit single-operator trust model. The owner was asked what auth model to build.
- Decision: For now, build only a single-user login flow (the owner's own account). The owner has also stated a future direction — additional accounts ("agents") should only be creatable by an Admin, under some policy system — but explicitly scoped that out of current work: "for now only Login flow."
- Reasoning: Owner's explicit direction — keep the current build scoped to what's needed now (a working login gate) rather than building out a multi-account/policy system that isn't needed yet.
- Consequences: Do not build multi-account creation, roles, or a policy engine until the owner asks for it specifically — treat "Admin-created agents under a policy" as a noted future direction in `PROJECT.md`/`TASKS.md`, not a current requirement. Specific login mechanics (session vs. token, password storage/hashing, where the single account's credentials live) are not yet decided — see Open decisions below.

## Decision: Hosting — Render free tier + UptimeRobot

- Status: Accepted
- Date: 2026-09-08
- Context: The browser-based site (see above) needs a hosting target. The owner's other project, Portfolio, already uses this exact pattern successfully (see Portfolio's own `Project Docs/ARCHITECTURE.md`/`DECISIONS.md`).
- Decision: Host on Render's free tier, with a free UptimeRobot monitor pinging the live URL to prevent Render's free-tier idle spin-down/cold-start — the same arrangement as the Portfolio project.
- Reasoning: Owner's explicit direction, reusing a pattern already proven to work on another of the owner's projects.
- Consequences: Render's free tier has no persistent disk (a real constraint the Portfolio project also hit for media storage) — if this panel ever needs to persist files (e.g. uploaded media through the Content Admin API path) rather than just proxying to remote sites, the same kind of external-storage workaround Portfolio needed (Cloudinary) may apply here too. Not yet relevant to the SQL-console/login-only current scope. Database hosting for the panel's *own* data (e.g. the single login account) is resolved in direction by [Phase 28] "Neon Free-Tier Postgres Setup" (see `PHASES.md`) — a Neon Postgres database, same pattern as Portfolio's production database — though the actual setup hasn't happened yet.

## Decision: Build a visual design canvas prototype before production implementation

- Status: Accepted (observed via existing artifact)
- Date: 2026-09-07 (commit `90a90b4`)
- Context: The owner wanted to validate the VS Code-metaphor UI design interactively before committing to a build.
- Decision: Publish a Claude Design canvas (`design/master-admin-panel.html`, source `design/Main.dc.html`/`design/canvas.json`) as a mock frontend — no real API calls, no real DB connection, no backend.
- Reasoning: Validates the UI/interaction design against the locked product concept before real implementation effort begins.
- Consequences: This prototype is a design/validation reference only, the same way Portfolio's `prototype/index.html` was a styling reference only for that project — it is not expected to be ported into or reused as production code. No decision has been recorded either way on reuse, since production implementation hasn't started; treat "prototype is reference only, not to be ported" as the working assumption unless the owner says otherwise when implementation begins.

## Open decisions (not yet made)

Carried forward from the original design record — do not treat any of these as settled:

- **Backend server framework/runtime**: Node.js is implied (to reuse `pg`/`mysql2`/`better-sqlite3`), but no specific framework (Express, Fastify, etc.) has been chosen for the browser-based backend — see "Browser-based web app" decision above. To be decided in [Phase 2] "Backend Server (Node.js)," see `PHASES.md`.
- **Secrets storage (browser-based)**: `safeStorage` no longer applies now that the panel isn't Electron — how API keys/tokens and DB credentials get stored server-side (env vars, an encrypted server-side store, a secrets manager, etc.) is not yet decided. To be decided and built in [Phase 10] "Secrets Storage Mechanism," see `PHASES.md`.
- **Login mechanics**: session vs. token auth, password storage/hashing, and where the single owner account's credentials live are not yet decided — see "Single-user login" decision above. To be decided in [Phase 4] "Login Auth Engine/Flow," see `PHASES.md`.
- **Versioning/history**: whether records get git-like diff/version history in the editor pane. **Not assigned to any phase** in the locked Phase 0–30 roadmap (see `PHASES.md`) — remains a genuinely open idea with no scheduled home; do not assume it will happen unless the owner adds a phase for it.
- **SQL console write safety**: read-only-by-default vs. unrestricted, potentially scoped further (per-database/per-connection policy) — see the SQL console decision above. To be decided and enforced in [Phase 8] "SQL Console Access/Modification Policy" (backend/database only — the real UI is separately [Phase 18], static, wired up in [Phase 23]'s general wiring-up work), see `PHASES.md`.
