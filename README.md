# MasterAdminPanel

A single, personal-use admin panel built once to manage content across every website its owner builds — instead of a bespoke admin UI per project. Visually and interactively it's modeled on the **VS Code** interface: activity bar, explorer tree, editor tabs, command palette, status bar, split panes.

> **Personal-use tool, not a product.** This is a single-operator utility, not multi-tenant software. Trust-boundary decisions (e.g. the SQL console connecting directly to a database) are made specifically in that context — see `Project Docs/DECISIONS.md`.

## What this is

- A **Content Admin API** client — auth, collection listing, schema-driven CRUD forms, media, search — against any backend that implements the contract, rendering the right editor for any content type without site-specific frontend code (the same trick a language server uses to let one editor support many languages).
- A dedicated **SQL query console** for direct, personal database access (table chips, query input, a real result grid), styled after VS Code's database-extension UX — a deliberate, explicit exception to the schema-driven CRUD path.
- A **staging layer**: schema-driven edits are held as drafts and compared against the live record in a split-pane view before an explicit, confirm-gated deploy applies them.

## Current status

The full build roadmap (Phase 0–31) is locked. **Phases 0–23 are complete**, and Phase 24 ("wire the static UI to the real backend") is in progress, split into six sub-phases.

**Built & complete**
- Real backend: Express + TypeScript, session-cookie auth (bcrypt, Postgres-backed sessions), a SQL console with a read-only-by-default / `confirm:true`-for-writes policy plus a protected-table-name safety net, schema-introspected CRUD across Postgres/MySQL/SQLite, encrypted secrets storage (AES-256-GCM), and a drafts/deploy staging layer
- Real frontend shell: every VS Code-metaphor UI piece (activity bar, explorer, tabs, command palette, status bar, split panes) matched to the design prototype
- Login gate wired end-to-end (frontend + backend), with every non-auth route requiring a session
- Explorer/tabs and the editor pane wired to real, schema-driven record data (text, boolean, date, number, relation, richtext, and a minimal Monaco JSON editor)
- Split-pane live-vs-staged comparison and a global bulk "deploy all drafts" action, wired to real data

**In progress (Phase 24)**
- SQL console panel wiring to the real backend (24d)
- Real multi-site switching in the activity bar (24e, remaining half)
- Command palette / status bar / state wrap-up (24f)

**Planned**
- Full Monaco configuration (Phase 25), a real Zustand state layer (Phase 26), first-class Image/Video field UI (Phase 27), full local end-to-end testing (Phase 28), the panel's own production Postgres on Neon (Phase 29), and Render deployment + live verification (Phases 30–31)

**Explicitly out of scope for now (Version 2):** multi-account/admin-role support, a runtime "generate connection" flow for new sites, and connecting to genuinely remote/production databases — see `Project Docs/PROJECT.md`.

See `Project Docs/TASKS.md` for exactly what's active right now, and `Project Docs/DECISIONS.md` for why things were built the way they were.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, plain CSS (no framework) |
| Backend | Node.js + Express + TypeScript (ESM), run via `tsx` in dev |
| Database | PostgreSQL (the panel's own data), plus Postgres/MySQL/SQLite as manageable target engines |
| Code/JSON editing | Monaco (minimal integration so far) |
| Auth | `express-session` + `connect-pg-simple` (Postgres-backed sessions), `bcryptjs` |
| Secrets | AES-256-GCM (`node:crypto`) encrypted storage in Postgres |
| Testing | Vitest (unit) + Playwright (API-mode e2e) |
| Hosting target | Render (free tier) + UptimeRobot keep-alive, Neon Postgres for production data |

## Project structure

```
backend/        Express + TypeScript API server
  src/auth/            Login, session gating, rate limiting
  src/sqlConsole/      Direct DB connections, query execution, write-safety policy
  src/dataManagement/  Schema introspection, CRUD, staging/drafts, deploy
  src/secrets/         Encrypted credential storage
  src/db/              Shared pool + schema bootstrap for the panel's own Postgres
  e2e/                 Playwright API-mode end-to-end tests

frontend/        React + TypeScript (Vite) client
  src/AppShell.tsx     Root VS Code-style layout (activity bar, sidebar, tabs, editor, status bar)
  src/editorFields.tsx Per-field-type editor dispatch (text, relation, richtext, Monaco JSON, ...)
  src/LoginPage.tsx    Login screen
  src/AuthGate.tsx     Session check + redirect gate

design/          Published Claude Design canvas prototype (visual/interaction reference only)
Project Docs/    Six-file (+1) documentation system — see below
```

## Getting started

**Prerequisites:** Node.js 24+, npm, PostgreSQL running locally (a MySQL install and a local SQLite file are optional, only needed to exercise those engines).

```bash
# Backend
cd backend
npm install
npm run dev        # starts the API server on http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev         # starts the Vite dev server, proxying API calls to the backend
```

### Environment configuration

A `.env.local` file at the repo root (gitignored, never committed) holds local secrets read by the backend:

```
ADMINPANEL_DB_HOST=
ADMINPANEL_DB_PORT=
ADMINPANEL_DB_NAME=
ADMINPANEL_DB_USER=
ADMINPANEL_DB_PASSWORD=
ADMINPANEL_DB_URL=
SESSION_SECRET=
SECRETS_MASTER_KEY=
TARGET_PG_URL=
TARGET_MYSQL_URL=
```

`ADMINPANEL_DB_*` / `ADMINPANEL_DB_URL` point at the panel's own Postgres database (login account, sessions, encrypted secrets, drafts). `TARGET_*` are only used for one-off seeding/migration scripts — once seeded, per-site database credentials live encrypted in the `secrets` table, not in the environment. Run `npm run seed:owner` (from `backend/`) to create the login account before first use.

### Useful backend scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API server with auto-reload |
| `npm run build` / `npm start` | Compile and run the production build |
| `npm run seed:owner` | Create/reset the single login account |
| `npm run migrate-secrets` | Move `TARGET_*`/`REMOTE_SITE_*` env credentials into encrypted storage |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright API-mode end-to-end tests |
| `npm run typecheck` | TypeScript check with no emit |

### Useful frontend scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run Oxlint |

## Documentation

This project keeps a living, seven-file Markdown documentation system under `Project Docs/`, each file with one distinct job — together they answer "what is this project and where does it stand" without reading the whole codebase:

| File | Answers |
|---|---|
| `CLAUDE.md` | How should Claude (the AI assistant) behave while working on this project? |
| `PROJECT.md` | What are we building, and why? |
| `PHASES.md` | In what order are we building it? (locked, Phase 0–31) |
| `TASKS.md` | What's being worked on right now? |
| `ARCHITECTURE.md` | How does the system work internally? |
| `DECISIONS.md` | Why did we choose to build it this way? |
| `CONTENT-ADMIN-API-SPEC.md` | The formal `/data-api` / `/auth-api` protocol reference (a deliberate exception to the six-file rule) |

## License

MIT — see [`LICENSE`](LICENSE).
