# CLAUDE.md

Rules and instructions for how Claude should work in this repository. Never Commit or Push anything until I say.

## Project Documentation System

This project uses a strict 6-file Markdown documentation system, each file with **one** distinct responsibility:

```text
CLAUDE.md       → Rules and instructions (this file)
PROJECT.md      → Project definition — what we're building, and why
PHASES.md       → Development roadmap — in what order we're building it
TASKS.md        → Current execution — what we're doing right now
ARCHITECTURE.md → System design — how the system works internally
DECISIONS.md    → Technical decision history — why we chose to build it this way
```

Claude must preserve this separation. Do not duplicate large sections across files — if a fact belongs in another file, put it there and reference it instead.

## Mandatory Maintenance Rules

### 1. Responsibility Separation
Keep each file focused on its own responsibility. Do not duplicate large sections across files.

### 2. TASKS.md
Must remain actionable. Tasks should normally belong to a phase defined in `PHASES.md`. Tasks represent concrete work, not vague project goals.

### 3. PHASES.md
Must remain high-level: development stages, milestones, sequencing — **not** individual coding tasks. The project owner determines the number and order of phases. Claude must not arbitrarily restructure the project's phase order or phase count, and must not invent phases the owner hasn't actually defined — leave the roadmap marked "to be defined" rather than guessing at a plausible-sounding sequence.

**Locked as of 2026-09-08**: the full roadmap (Phase 0–31) is complete — see the lock notice at the top of `PHASES.md`. Claude must not add, remove, reorder, renumber, or otherwise edit any phase in that file without an explicit, direct command from Admin (the project owner) in that session. Do not infer a phase change from other work, from a related doc update, or from a "this seems like it should be added" judgment call — ask instead. Admin can update `PHASES.md` freely; this restriction applies to Claude only.

### 4. ARCHITECTURE.md
Describes the project's actual technical structure — stable system design, relationships, boundaries, data flow, dependencies, architectural patterns. Not a dumping ground for temporary implementation notes.

### 5. DECISIONS.md
Records significant technical decisions and the reasoning behind them. Do not create decision records for trivial coding choices.

### 6. Documentation Accuracy
Update documentation when major project changes make existing documentation inaccurate.

### 7. No Silent Destruction
Never silently modify, delete, or replace important documentation. If a change makes existing documentation obsolete: (1) identify what became obsolete, (2) explain why, (3) determine which file(s) should change, (4) make the update deliberately. Do not casually overwrite historical information.

### 8. Six-File Limit
Do not create additional Markdown documentation files unless information genuinely cannot fit into these six. Assume these six are sufficient by default.

**One deliberate exception exists, as of [Phase 9] (2026-09-09):** `Project Docs/CONTENT-ADMIN-API-SPEC.md` — a formal protocol reference for future Content Admin API implementers. None of the six files' responsibilities fit a technical spec meant to be read by a third party implementing against this system (as opposed to project-management documentation about the system itself), so a seventh file was justified rather than folding a large protocol reference into `ARCHITECTURE.md`. This is the only sanctioned exception — do not treat it as precedent for adding further files without the same "genuinely doesn't fit the six" bar being met again.

### 9. Actual Project State
Documentation must always reflect the actual project state. Never document a feature, architecture, system, component, or integration as completed when it is not actually implemented, and never leave a doc claiming something is *not* built once it actually is — both directions are inaccuracy. **As of [Phase 23] (2026-09-11), Phases 0–23 are complete**: real backend code exists for login, the SQL console, the schema-driven data-management/staging engine, and secrets storage, plus every VS Code UI element as a static, prototype-matched piece (with the split-pane UI additionally wired end-to-end for one demo record) — see `ARCHITECTURE.md` for exactly what's implemented vs. still planned, and `TASKS.md` for current status. The Electron app framing is fully superseded (see `DECISIONS.md`) — this is a browser-based React/Node app now.

### 10. Whole-Project Understanding
Together, the six files should let Claude answer "Analyze the whole project" without reading the entire codebase first — but they remain a high-level representation, not a replacement for source code.

## Documentation Conflict Priority

```text
CLAUDE.md
    ↓
PROJECT.md
    ↓
PHASES.md
    ↓
TASKS.md
    ↓
ARCHITECTURE.md
    ↓
DECISIONS.md
```

When information conflicts between documentation files, the higher-priority document governs. **However**, when code and documentation disagree, do not blindly trust the documentation — inspect the code, determine the actual current state, and correct the stale documentation.

## Mandatory Pre-Change Documentation Check

Before making any significant project change, identify which documentation file(s) will become affected or inaccurate as a consequence:

- New project requirement → `PROJECT.md`
- Change in development stage → `PHASES.md`
- New/current implementation work → `TASKS.md`
- Architectural change → `ARCHITECTURE.md`
- Significant technical choice → `DECISIONS.md`
- Change to Claude's working rules → `CLAUDE.md`

A single change may require updates to multiple files.

## Project-Specific Notes

- **Historical note, true only as of 2026-09-08 (Phase 0):** at that point the repository contained only a design/prototype layer, no production code: `design/master-admin-panel.html` (a published Claude Design canvas — an interactive visual prototype/mockup of the panel's UI, referenced from `DESIGN.md`'s "Prototype" link) plus its source files `design/Main.dc.html` and `design/canvas.json`. **This is no longer the current state** — real `backend/`/`frontend/` code exists as of Phases 1–23 (see `ARCHITECTURE.md`); the design canvas prototype remains in the repo as a visual reference only, per its own original decision record (`DECISIONS.md`), not as a claim that it's still the only code that exists. An empty `Prototype/` folder exists at the repo root with no content yet — do not assume it holds anything.
- The product design (VS Code-metaphor UI, Content Admin API protocol, SQL console) and the technology stack were both locked during planning discussions **before this documentation system existed** — originally recorded in `docs/DESIGN.md` and `docs/tech.md`. Those two files were migrated into this 6-file system (`PROJECT.md`/`ARCHITECTURE.md`/`DECISIONS.md`) and then deleted from the repo — their content now lives here, not in `docs/`. Do not recreate `docs/DESIGN.md` or `docs/tech.md`. **The stack itself was later revised (2026-09-08)** from an Electron desktop app to a browser-based web app (React/TypeScript/Vite frontend + Node.js backend server) — see `DECISIONS.md` for the current, authoritative stack; do not describe this project as an Electron app.
- This is explicitly a **personal-use, single-operator tool** — not a multi-tenant product. Security/scoping decisions (e.g. the SQL console connecting directly to a database, bypassing the Content Admin API's validation layer) are deliberately made in that context. Do not generalize this project's trust-boundary decisions to a multi-user scenario without the owner re-confirming them.
- **The full build roadmap (Phase 0–31) is locked** — see `PHASES.md` and rule 3 above. Phases 0–23 are complete (see `TASKS.md`), including every item this bullet used to list as open: "spec-first vs. site-first" (resolved site-first, by roadmap ordering), login mechanics ([Phase 4]), the SQL console's basic and granular write-safety/access policy ([Phase 5]/[Phase 8]), and the secrets-storage mechanism ([Phase 10]) — see `DECISIONS.md` for each. **Remaining genuinely open items without a settled answer**, even though most now have an assigned phase: a real, remotely-implementable Content Admin API surface (per-site auth/API keys, search, media listing — **not assigned to any phase**); full versioning/history in the record editor (**not assigned to any phase** — [Phase 23] incidentally added an append-only `deploy_log` table with no read UI/endpoint yet, which is not the same as this being resolved — see `DECISIONS.md`). Do not treat either as decided.
