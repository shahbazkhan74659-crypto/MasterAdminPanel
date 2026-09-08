# Current Tasks

## Active

None in progress. [Phase 0] "Pre-Development (Design & Stack Decision)" is complete — design and stack are locked (see `PHASES.md`, `DECISIONS.md`). No implementation work has started.

## Next

The owner has identified two candidate directions for the first real implementation step, but has not committed to either or broken it into phases — do not assume one is chosen:

1. Write a first draft of the **Content Admin API spec** (spec-first).
2. Pick one existing site (e.g. the Portfolio project) to retrofit as the first real implementer of the contract, and wire a real DB connection for its SQL console (site-first).

This mirrors the still-open "spec-first vs. site-first" decision in `DECISIONS.md`.

Several other product decisions also remain open and should be resolved (or explicitly deferred with the owner's sign-off) before or during whichever direction above gets picked:
- Exact secrets-storage scoping (how per-site API keys and per-site DB credentials are organized within `safeStorage`).
- Whether records get git-like diff/version history in the editor pane.
- Whether the SQL console defaults to read-only with a confirm step before non-`SELECT` statements, or stays unrestricted.

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
