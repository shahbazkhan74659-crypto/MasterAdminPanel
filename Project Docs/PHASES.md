# Development Phases

The project owner has not yet defined a numbered build roadmap beyond the pre-development stage recorded below. Do not invent additional phases or a plausible-sounding sequence — see `CLAUDE.md` rule 3. When the owner defines Phase 1 onward, add it here.

## Phase 0 — Pre-Development (Design & Stack Decision)

### Objective
Define the product concept, UI/interaction model, core protocol architecture, and technology stack, and validate the design against a working visual prototype — before writing any production code.

### Scope

**0a. Product & Design Definition**
- Core concept defined: a personal, reusable admin panel driven by a shared "Content Admin API" protocol, rather than a one-off UI per site (see `PROJECT.md`).
- VS Code-metaphor UI mapped out (activity bar, explorer tree, editor tabs, command palette, status bar, split panes) (see `PROJECT.md`, `ARCHITECTURE.md`).
- Schema-driven forms identified as the load-bearing design decision — the API describes its own schema so one UI can render editors for arbitrary content types (see `DECISIONS.md`).
- SQL console scoped as a deliberate, explicit exception to the schema-driven CRUD path — connects directly to the database rather than through the Content Admin API (see `DECISIONS.md`).
- Several product decisions explicitly left open rather than guessed at: spec-first vs. site-first build order, secrets-storage scoping detail, versioning/history in the editor, SQL console write-safety default (see `DECISIONS.md`, `TASKS.md`).

**Status: Complete**, as evidenced by the locked design record in `DECISIONS.md` (originally `docs/DESIGN.md`, migrated).

**0b. Technology Stack Decision**
- Stack originally chosen: Electron + React/TypeScript (Vite) + Monaco + Zustand + native per-engine DB drivers (`pg`/`mysql2`/`better-sqlite3`) + Electron `safeStorage` + `electron-store` + `electron-builder` (see `DECISIONS.md`). Tauri evaluated and explicitly rejected.
- **Revised 2026-09-08**: owner decided to run the panel as a browser-based web app instead of an Electron desktop app — Electron/Tauri, `safeStorage`, `electron-store`, and `electron-builder` are all superseded. React/TypeScript/Vite/Monaco/Zustand carry over unchanged; DB drivers move into a new backend server component; hosting is Render's free tier + UptimeRobot; a single-user login gate is now required (a desktop app didn't need one). See `DECISIONS.md` for the full decision history and what's still open (backend framework, secrets storage, login mechanics).

**Status: Complete**, as a locked direction — see `DECISIONS.md` (originally `docs/tech.md`, migrated, then revised 2026-09-08). Several implementation-level specifics under the new browser-based direction remain open — see `TASKS.md`.

**0c. Visual Prototyping**
- A design canvas prototype (`design/master-admin-panel.html`, plus its source `design/Main.dc.html`/`design/canvas.json`) built and published, demonstrating the VS Code-metaphor UI as a mock frontend only — no real API calls, no real DB connection.

**Status: Complete.** The existing design canvas is sufficient as a design/validation reference — no further prototyping work is scheduled before the owner picks a next real-implementation step (see `TASKS.md`'s Next section for the two candidate directions under consideration).

### Completion Criteria
- 0a: Complete — product/UI/protocol design locked (see `DECISIONS.md`).
- 0b: Complete — stack locked (see `DECISIONS.md`).
- 0c: Complete — `design/master-admin-panel.html` exists and serves as the interactive design reference.

**Phase 0 overall status: Complete.**

## Phase 1 onward

Not yet defined. The owner has identified two candidate next-step directions (drafting the Content Admin API spec, or retrofitting one existing site as the first real implementer of the contract) but has not committed to either or broken them into phases — see `TASKS.md`'s Next section. Do not assume either direction is decided.
