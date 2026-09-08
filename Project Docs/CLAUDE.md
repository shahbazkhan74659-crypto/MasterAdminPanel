# CLAUDE.md

Rules and instructions for how Claude should work in this repository.

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

### 9. Actual Project State
Documentation must always reflect the actual project state. Never document a feature, architecture, system, component, or integration as completed when it is not actually implemented. As of this writing, **no production code exists** — only a design/prototype layer (see `ARCHITECTURE.md`). Do not describe the Electron/React app, the Content Admin API, or the SQL console as built until they actually are.

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

- **As of 2026-09-08**, the repository contains only a design/prototype layer, no production code: `design/master-admin-panel.html` (a published Claude Design canvas — an interactive visual prototype/mockup of the panel's UI, referenced from `DESIGN.md`'s "Prototype" link) plus its source files `design/Main.dc.html` and `design/canvas.json`. An empty `Prototype/` folder exists at the repo root with no content yet — do not assume it holds anything.
- The product design (VS Code-metaphor UI, Content Admin API protocol, SQL console) and the technology stack (Electron + React/TypeScript + Vite + Monaco + Zustand + native DB drivers) were both locked during planning discussions **before this documentation system existed** — originally recorded in `docs/DESIGN.md` and `docs/tech.md`. Those two files were migrated into this 6-file system (`PROJECT.md`/`ARCHITECTURE.md`/`DECISIONS.md`) and then deleted from the repo — their content now lives here, not in `docs/`. Do not recreate `docs/DESIGN.md` or `docs/tech.md`.
- This is explicitly a **personal-use, single-operator tool** — not a multi-tenant product. Security/scoping decisions (e.g. the SQL console connecting directly to a database, bypassing the Content Admin API's validation layer) are deliberately made in that context. Do not generalize this project's trust-boundary decisions to a multi-user scenario without the owner re-confirming them.
- Several product decisions remain genuinely open (see `DECISIONS.md` and `TASKS.md`'s Next section) — spec-first vs. site-first build order, exact secrets-storage scoping, versioning/history in the record editor, and the SQL console's default write-safety posture (read-only vs. unrestricted). Do not treat any of these as settled; ask the owner before building against an assumed answer.
