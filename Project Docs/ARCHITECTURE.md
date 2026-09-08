# Architecture

This describes the **actual current implementation** — a design/prototype layer only, no production code — followed by the **planned** production architecture. See `DECISIONS.md` for the reasoning behind the planned design and stack.

## System Overview

**Implemented:** The repository contains no production application code. It holds a published Claude Design canvas, `design/master-admin-panel.html` (a self-contained HTML artifact — an early preview of the Claude Design canvas editor, packaged to run as a published artifact page), plus its editable source files `design/Main.dc.html` (the single artboard's content) and `design/canvas.json` (canvas layout). This is the interactive visual prototype referenced as "Prototype" in the design record (see `DECISIONS.md`) — a mock frontend demonstrating the intended VS Code-styled UI, with no real API calls, no real database connection, and no backend behind it. An empty `Prototype/` folder exists at the repo root with no content.

**Planned:** An Electron desktop application (Windows-first) with a React + TypeScript renderer (built via Vite), styled and structured after the VS Code interface, communicating with two distinct backends: (1) arbitrary remote sites over HTTPS via the Content Admin API protocol, and (2) local/remote databases via direct native drivers running in Electron's main process. No planned-architecture code has been written yet.

## Technology Stack

**Implemented:** None (design-only artifact, see above).

**Planned** (locked, see `DECISIONS.md`):

| Layer | Choice | Why |
|---|---|---|
| Shell | Electron | Same foundation as real VS Code; Node.js main process gets direct DB-driver access with no sidecar process. |
| UI | React + TypeScript, built with Vite | Matches the component/state model already proven in the prototype; fast dev loop. |
| Code/SQL editing | Monaco (the actual VS Code editor component) | Real syntax highlighting for the SQL console and any raw JSON/code fields. |
| State management | Zustand | Lightweight global store for open tabs, active site, connections. |
| DB access (SQL console) | Node drivers per engine (`pg`, `mysql2`, `better-sqlite3`) in the Electron main process, exposed to the renderer via `contextBridge`/IPC | Implements the "connect directly to the DB" decision (see `DECISIONS.md`). |
| Content Admin API client | Plain `fetch` from the renderer | Outbound HTTPS only, to sites the user controls. |
| Secrets (API keys, DB credentials) | Electron's built-in `safeStorage` | OS-backed encryption, no extra native dependency. |
| Local app state (layout, recent sites, open tabs) | `electron-store` | Simple JSON persistence for non-secret settings only. |
| Packaging | `electron-builder` | Windows installer for the primary dev machine. |

Tauri was evaluated and rejected — see `DECISIONS.md`.

## Application Structure

**Implemented:** No application structure exists yet — only the design canvas artifact described above.

**Planned:** Not yet broken down into concrete modules/files — depends on Phase 1+ work, which is not yet defined (see `PHASES.md`). The product design (see `PROJECT.md`) implies at least: a renderer UI layer (activity bar / explorer / tabs / editor pane / command palette / status bar), a Content Admin API client module, and a main-process DB-connection module per supported engine — but no file/module layout has been decided.

## Component Structure

**Implemented:** The design canvas prototype demonstrates the VS Code-metaphor UI visually (activity bar, explorer tree, tabs, editor pane, command palette, status bar) but as static/mock design content, not real React components.

**Planned:** Real component structure not yet decided. Will need to reflect the VS Code element mapping recorded in `PROJECT.md` (activity bar → site/module switcher, explorer tree → collections/records, tabs → open records, editor pane → schema-driven form or Monaco instance, command palette → quick actions, status bar → connection/save state) plus a distinct SQL console tab type (its own icon, per-site, styled after a VS Code database extension: table chips, query input, result grid).

## Data Flow

**Implemented:** None — no real data flow exists; the prototype has no data fetching or persistence.

**Planned:** Two independent flows, per `PROJECT.md`'s Content Admin API protocol vs. SQL console distinction:
1. **Content Admin API path**: renderer → `fetch()` over HTTPS → a remote site's Content Admin API → schema + records returned → panel renders the appropriate editor for each field type (text, rich text, image picker, relation dropdown, date, boolean, array, etc.) based on the schema the API itself describes.
2. **SQL console path**: renderer → IPC → Electron main process → native DB driver (`pg`/`mysql2`/`better-sqlite3`) → direct connection to the target database, bypassing the Content Admin API and any schema validation it would otherwise enforce. This is a deliberate exception, acceptable specifically because this is a personal, single-operator tool (see `DECISIONS.md`).

Not yet decided: whether the SQL console defaults to read-only with an explicit confirm step before non-`SELECT` statements (see `DECISIONS.md`, `TASKS.md`).

## State Management

**Implemented:** None.

**Planned:** Zustand for renderer-side global state — open tabs, active site/workspace, connection status. `electron-store` for persisted local app settings (layout, recent sites, open tabs) that are not secrets. Secrets (API keys, DB credentials) are planned to be stored separately via Electron's `safeStorage`, kept as two distinct secret categories (API keys vs. DB credentials) rather than conflated (see `DECISIONS.md`).

## Routing

**Implemented:** None — the prototype is a single static canvas, not a routed application.

**Planned:** Not yet decided — likely tab/panel-based navigation (VS Code-style, no URL-based routing) given the desktop-app shell, but no decision has been recorded.

## API Architecture

**Implemented:** None.

**Planned:** The **Content Admin API** — a protocol the panel speaks as an HTTP client, not a specific server this repository implements. Any backend can serve it by exposing: auth (get a session/token), list collections, get a collection's schema (field names, types, validation, relations), CRUD on records within a collection, media upload/listing, and search. The schema-driven nature of this API (the server describes its own schema rather than the panel hardcoding it per site) is the core architectural decision this whole project is built around (see `DECISIONS.md`). No spec draft exists yet — see `PHASES.md`/`TASKS.md` for this as an open next-step candidate. The API's tech stack is a per-site decision, out of scope for this repository.

Two tiers of API implementer are anticipated: (1) sites the owner builds, implementing the contract natively — the primary v1 target; (2) third-party platforms (WordPress, Shopify, etc.), which would need a per-platform adapter translating their native API into the Content Admin API contract — not required for v1.

## Data / Persistence

**Implemented:** None.

**Planned:** No persistence layer of its own beyond local app settings (`electron-store`) and OS-encrypted secrets (`safeStorage`). The panel does not own a database — it either (a) reads/writes remote sites' content through their own Content Admin API implementations, or (b) connects directly to a target database via native drivers for the SQL console. Per-site DB credentials and per-site API keys/tokens are planned as two separate secret categories.
