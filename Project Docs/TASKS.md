# Current Tasks

## Active

None in progress. [Phase 0] "Pre-Development (Design & Stack Decision)" is complete — design and stack are locked (see `PHASES.md`, `DECISIONS.md`). No implementation work has started.

## Next

The owner has identified two candidate directions for the first real implementation step, but has not committed to either or broken it into phases — do not assume one is chosen:

1. Write a first draft of the **Content Admin API spec** (spec-first).
2. Pick one existing site (e.g. the Portfolio project) to retrofit as the first real implementer of the contract, and wire a real DB connection for its SQL console (site-first).

This mirrors the still-open "spec-first vs. site-first" decision in `DECISIONS.md`.

Following the 2026-09-08 pivot to a browser-based web app (see `DECISIONS.md`), several new implementation-level decisions are also open and should be resolved (or explicitly deferred with the owner's sign-off) before or during whichever direction above gets picked:
- Backend server framework/runtime choice (Node.js is implied; specific framework not chosen).
- Secrets-storage mechanism now that `safeStorage` no longer applies (server-side env vars, encrypted store, secrets manager, etc.).
- Login mechanics: session vs. token auth, password storage/hashing, where the single owner account's credentials live.
- Where the panel's own data (login account, any per-site credentials) gets persisted, given Render's free tier has no persistent disk.
- Whether records get git-like diff/version history in the editor pane.
- Whether the SQL console defaults to read-only with a confirm step before non-`SELECT` statements, or stays unrestricted.

Explicitly **not** current scope, per the owner's direction: multi-account creation, an Admin role, or any policy system for additional "agent" accounts. Only the single-user login flow is being built for now — see `DECISIONS.md`, `PROJECT.md`.

## Blocked

None.

## Completed

- [x] [Phase 0a] Defined the core product concept: one reusable, personal admin panel driven by a shared Content Admin API protocol, instead of a bespoke UI per site — see `PROJECT.md`, `DECISIONS.md`.
- [x] [Phase 0a] Mapped the VS Code-metaphor UI (activity bar, explorer tree, editor tabs, command palette, status bar, split panes) onto the panel's intended interaction model — see `PROJECT.md`, `DECISIONS.md`.
- [x] [Phase 0a] Identified schema-driven forms as the load-bearing design decision, and scoped the SQL console as a deliberate, separate exception to the schema-driven CRUD path — see `DECISIONS.md`.
- [x] [Phase 0b] Locked the production stack: Electron + React/TypeScript (Vite) + Monaco + Zustand + native per-engine DB drivers + `safeStorage` + `electron-store` + `electron-builder`; evaluated and rejected Tauri — see `DECISIONS.md`.
- [x] [Phase 0c] Built and published a design canvas prototype (`design/master-admin-panel.html`) validating the VS Code-metaphor UI as a mock frontend — 2026-09-07, commit `90a90b4` — see `ARCHITECTURE.md`.
- [x] Committed the initial design/stack/prototype work to `main` — 2026-09-07 (commit `90a90b4`, "Add Master Admin Panel design, tech stack decision, and working prototype").
- [x] Migrated `docs/DESIGN.md` and `docs/tech.md` into this 6-file documentation system (`PROJECT.md`, `ARCHITECTURE.md`, `DECISIONS.md`) and removed the original two files — 2026-09-08, matching the Portfolio project's documentation structure.
- [x] Revised [Phase 0b]'s stack decision: pivoted from an Electron desktop app to a browser-based web app (frontend + backend server), hosted on Render's free tier + UptimeRobot, gated by a new single-user login (a desktop app didn't need one) — 2026-09-08, owner's explicit direction ("just use it as a browser based site"). A future Admin/policy-controlled multi-account system was noted as a direction but explicitly scoped out of current work. Updated `PHASES.md`, `PROJECT.md`, `ARCHITECTURE.md`, `DECISIONS.md` accordingly — see `DECISIONS.md` for the full before/after and newly-open implementation decisions.
