# Current Tasks

## Active

[Phase 1b] "All Database Engine Types Setup" — not yet started. [Phase 1a] "Local Postgres for the App Itself" is now complete (see Completed below) — next up is provisioning the local Postgres/MySQL/SQLite target-database engines the SQL Console and Content Admin API will manage/query (e.g. Portfolio → Postgres, TS Library → MySQL). See `PHASES.md` for the full objective/scope/completion criteria.

## Next

The full roadmap (`PHASES.md`, Phase 0–30) is locked and gives the complete build order — Phase 1b is next up per Active above. A few items are still genuinely undecided even though most now have an assigned phase (the phase is *when* it gets decided, not that it already has been):
- Backend server framework/runtime choice (Node.js is implied; specific framework — Express, Fastify, etc. — to be decided as part of [Phase 2], see `PHASES.md`).
- Secrets-storage mechanism now that `safeStorage` no longer applies — to be decided as part of [Phase 10] "Secrets Storage Mechanism", see `PHASES.md`.
- Login mechanics: session vs. token auth, password storage/hashing, where the single owner account's credentials live — to be decided as part of [Phase 4] "Login Auth Engine/Flow", see `PHASES.md`.
- Whether the SQL console defaults to read-only with a confirm step before non-`SELECT` statements, or stays unrestricted — to be decided as part of [Phase 8] "SQL Console Access/Modification Policy", see `PHASES.md`.
- Whether records get git-like diff/version history in the editor pane — **not assigned to any phase** in the locked roadmap; a genuinely open idea with no scheduled home.

Resolved 2026-09-08: "spec-first vs. site-first" is settled by roadmap ordering — Phase 6/7 (build the Content Admin API) come before Phase 9 (document its spec), so the project proceeds **site-first**. See `DECISIONS.md`.

Resolved 2026-09-08: "where the panel's own data gets persisted" (Render's free tier has no disk) is settled in direction — [Phase 28] "Neon Free-Tier Postgres Setup" — though the actual setup and migration of Phase 4/10's data into it hasn't happened yet.

Explicitly **not** current scope, per the owner's direction: multi-account creation, an Admin role, or any policy system for additional "agent" accounts. Only the single-user login flow is being built for now — see `DECISIONS.md`, `PROJECT.md`. Also not scheduled: a dedicated media library/browser UI beyond per-record Image/Video fields (Phase 6/26) — see `DECISIONS.md`.

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
- [x] Defined and locked the full build roadmap, Phase 1 through Phase 30 — 2026-09-08, phase by phase per Admin's direct commands: local multi-engine DB setup (1), backend server (2), a temporary test page (3), login (4), SQL console backend (5), the data management/CRUD engine and Content Admin API implementation (6–7, reordered mid-session once their dependency became clear), the SQL console's access/modification policy narrowed to backend-only (8), the Content Admin API spec document (9), secrets storage (10), a backend end-to-end test pass retiring the Phase 3 test page (11), every static UI piece matched to the design canvas prototype (12–22, including a flagged and resolved overlap between the old "Phase 8" and the new static SQL Console panel phase), wiring the full UI to the backend (23), Monaco and Zustand taken from minimal to fully functional (24–25), Image/Video field types split across backend (folded into Phase 6) and frontend (26), full local end-to-end testing (27), the panel's own production database on Neon (28), actual Render deployment with UptimeRobot (29), and full live end-to-end testing (30). `PHASES.md` was then explicitly locked against further unprompted edits — see `PHASES.md`'s lock notice and `CLAUDE.md` rule 3. `PROJECT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and this file were all updated to stay consistent with the completed roadmap (stale "not yet defined"/"open" framing removed, phase cross-references added throughout, a new decision record added for the Image/Video field types).
- [x] Split [Phase 1] into [Phase 1a] "Local Postgres for the App Itself" and [Phase 1b] "All Database Engine Types Setup" — 2026-09-08, owner's direct command. 1a is new: a dedicated local Postgres instance for the panel's own data (login account, secrets), giving Phase 4/10 a concrete local home instead of the previously open "database from Phase 1, or another mechanism" framing. 1b carries over the original Phase 1 scope unchanged (local Postgres/MySQL/SQLite as target/managed databases). Updated all downstream cross-references in `PHASES.md` (Phases 3, 4, 5, 7, 11, 28) and this file's Active/Next sections accordingly.
- [x] [Phase 1a] Completed — 2026-09-08. Used the owner's already-installed local PostgreSQL 18 (native Windows service, shared across their other local projects) — no new install needed. Created a dedicated, isolated role/database (`adminpanel_app`/`adminpanel_app`), verified reachable via `psql` connecting as that role (not the `postgres` superuser), and recorded connection details in a local, gitignored `.env.local` at the repo root (interim placeholder — Phase 10 still owns the real secrets-storage decision). See `PHASES.md`'s Phase 1a entry for full verification detail.
