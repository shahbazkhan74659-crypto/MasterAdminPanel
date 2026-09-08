# Architecture

This describes the **actual current implementation** — a design/prototype layer only, no production code — followed by the **planned** production architecture. See `DECISIONS.md` for the reasoning behind the planned design and stack.

## System Overview

**Implemented:** The repository contains no production application code. It holds a published Claude Design canvas, `design/master-admin-panel.html` (a self-contained HTML artifact — an early preview of the Claude Design canvas editor, packaged to run as a published artifact page), plus its editable source files `design/Main.dc.html` (the single artboard's content) and `design/canvas.json` (canvas layout). This is the interactive visual prototype referenced as "Prototype" in the design record (see `DECISIONS.md`) — a mock frontend demonstrating the intended VS Code-styled UI, with no real API calls, no real database connection, and no backend behind it. An empty `Prototype/` folder exists at the repo root with no content.

**Planned:** A browser-based web app (**superseding an earlier Electron desktop-app plan**, reversed 2026-09-08 — see `DECISIONS.md`): a React + TypeScript frontend (built via Vite), styled and structured after the VS Code interface, served by a Node.js backend server, gated behind a single-user login. The frontend talks to two distinct backends: (1) arbitrary remote sites over HTTPS via the Content Admin API protocol (client-side `fetch`, unchanged from the original plan), and (2) this panel's own backend server, which holds the native DB drivers and brokers the SQL console's direct database connections (replacing Electron's main-process/IPC arrangement). Deployment target: Render's free tier + an UptimeRobot keep-alive monitor, the same pattern as the Portfolio project. No planned-architecture code has been written yet.

## Technology Stack

**Implemented:** None (design-only artifact, see above).

**Planned** (see `DECISIONS.md` — Electron-specific rows below are superseded; carried-over and new rows reflect the 2026-09-08 browser-based pivot):

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript, built with Vite | Matches the component/state model already proven in the prototype; fast dev loop. Unchanged by the browser-based pivot. |
| Backend server | Node.js (specific framework — e.g. Express/Fastify — not yet chosen) | Needed so the browser can reach native DB drivers indirectly; replaces Electron's main process. See Open decisions in `DECISIONS.md`. |
| Code/SQL editing | Monaco (the actual VS Code editor component) | Real syntax highlighting for the SQL console and any raw JSON/code fields. Monaco is web-native, so this is unaffected by the pivot. |
| State management | Zustand | Lightweight global store for open tabs, active site, connections. Unchanged. |
| DB access (SQL console) | Node drivers per engine (`pg`, `mysql2`, `better-sqlite3`), now running in the backend server and exposed to the frontend via an authenticated HTTP/WebSocket API instead of Electron's `contextBridge`/IPC | Implements the "connect directly to the DB" decision (see `DECISIONS.md`), relocated from an Electron main process to a standalone backend server. |
| Content Admin API client | Plain `fetch` from the frontend | Outbound HTTPS only, to sites the user controls. Unchanged. |
| Auth | Single-user login (mechanics — session vs. token, credential storage — not yet decided) | The browser-based site is reachable by anyone with the URL, unlike a desktop app installed only on the owner's machine — see `DECISIONS.md`. |
| Secrets (API keys, DB credentials) | Not yet decided — `safeStorage` no longer applies (Electron-only) | Needs a server-side mechanism (env vars, encrypted store, secrets manager) — see Open decisions in `DECISIONS.md`. |
| Local/app state (layout, recent sites, open tabs) | Not yet decided — `electron-store` no longer applies (Electron-only) | Likely browser storage and/or server-persisted settings; not yet chosen. |
| Hosting / deployment | Render free tier + UptimeRobot | Owner's explicit choice, reusing the exact pattern the Portfolio project already runs on. Replaces `electron-builder`/desktop packaging entirely. |

The Electron-vs-Tauri shell decision (and the Tauri rejection reasoning) is now moot given the browser-based pivot — see `DECISIONS.md` for the full history.

## Application Structure

**Implemented:** No application structure exists yet — only the design canvas artifact described above.

**Planned:** Not yet broken down into concrete modules/files — depends on Phase 1+ work, which is not yet defined (see `PHASES.md`). The product design (see `PROJECT.md`) implies at least: a frontend UI layer (activity bar / explorer / tabs / editor pane / command palette / status bar), a Content Admin API client module, a login/auth flow, and a backend-server DB-connection module per supported engine — but no file/module layout has been decided.

## Component Structure

**Implemented:** The design canvas prototype demonstrates the VS Code-metaphor UI visually (activity bar, explorer tree, tabs, editor pane, command palette, status bar) but as static/mock design content, not real React components.

**Planned:** Real component structure not yet decided. Will need to reflect the VS Code element mapping recorded in `PROJECT.md` (activity bar → site/module switcher, explorer tree → collections/records, tabs → open records, editor pane → schema-driven form or Monaco instance, command palette → quick actions, status bar → connection/save state) plus a distinct SQL console tab type (its own icon, per-site, styled after a VS Code database extension: table chips, query input, result grid).

## Data Flow

**Implemented:** None — no real data flow exists; the prototype has no data fetching or persistence.

**Planned:** Two independent flows, per `PROJECT.md`'s Content Admin API protocol vs. SQL console distinction:
1. **Content Admin API path**: frontend → `fetch()` over HTTPS → a remote site's Content Admin API → schema + records returned → panel renders the appropriate editor for each field type (text, rich text, image picker, relation dropdown, date, boolean, array, etc.) based on the schema the API itself describes.
2. **SQL console path**: frontend → authenticated HTTP/WebSocket request → this panel's own backend server → native DB driver (`pg`/`mysql2`/`better-sqlite3`) → direct connection to the target database, bypassing the Content Admin API and any schema validation it would otherwise enforce. Relocated from Electron's IPC/main-process arrangement to a standalone backend server as part of the 2026-09-08 browser-based pivot (see `DECISIONS.md`) — still a deliberate exception, acceptable specifically because this is a personal, single-operator tool.

A third flow now exists that didn't under the desktop-app plan: **login** — the browser client must authenticate against the backend server before reaching either flow above (see `DECISIONS.md`'s "Single-user login" decision). Mechanics not yet decided.

Not yet decided: whether the SQL console defaults to read-only with an explicit confirm step before non-`SELECT` statements (see `DECISIONS.md`, `TASKS.md`).

## State Management

**Implemented:** None.

**Planned:** Zustand for frontend global state — open tabs, active site/workspace, connection status. Persisted local app settings (layout, recent sites, open tabs) need a new mechanism now that `electron-store` no longer applies — not yet decided (browser storage vs. server-persisted, per Open decisions in `DECISIONS.md`). Secrets (API keys, DB credentials) also need a new server-side storage mechanism now that Electron's `safeStorage` no longer applies — not yet decided, but the "keep as two distinct secret categories" principle (API keys vs. DB credentials) still stands regardless of mechanism.

## Routing

**Implemented:** None — the prototype is a single static canvas, not a routed application.

**Planned:** Not yet decided — likely still tab/panel-based navigation (VS Code-style, no URL-based routing) within the app shell, plus a real route/redirect for the login gate itself now that the app is browser-based. No decision has been recorded.

## API Architecture

**Implemented:** None.

**Planned:** The **Content Admin API** — a protocol the panel speaks as an HTTP client, not a specific server this repository implements. Any backend can serve it by exposing: auth (get a session/token), list collections, get a collection's schema (field names, types, validation, relations), CRUD on records within a collection, media upload/listing, and search. The schema-driven nature of this API (the server describes its own schema rather than the panel hardcoding it per site) is the core architectural decision this whole project is built around (see `DECISIONS.md`). No spec draft exists yet — see `PHASES.md`/`TASKS.md` for this as an open next-step candidate. The API's tech stack is a per-site decision, out of scope for this repository.

Two tiers of API implementer are anticipated: (1) sites the owner builds, implementing the contract natively — the primary v1 target; (2) third-party platforms (WordPress, Shopify, etc.), which would need a per-platform adapter translating their native API into the Content Admin API contract — not required for v1.

## Data / Persistence

**Implemented:** None.

**Planned:** The panel does not own a content database — it either (a) reads/writes remote sites' content through their own Content Admin API implementations, or (b) connects directly to a target database via native drivers for the SQL console. It does now need some persistence of its own that didn't exist under the desktop-app plan: at minimum, the single login account's credentials, plus wherever per-site DB credentials/API keys end up being stored server-side. None of this storage layer is decided yet (see Open decisions in `DECISIONS.md`). Render's free tier has no persistent disk (the same constraint the Portfolio project hit for media storage) — relevant if this panel's own data ends up needing file storage rather than just a small database.
