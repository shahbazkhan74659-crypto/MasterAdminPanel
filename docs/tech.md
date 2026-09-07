# Master Admin Panel — Tech Stack

Status: **LOCKED**. This is the approved stack for implementation. See `docs/DESIGN.md` for the
product/UI design this stack is built to serve.

## Why not a pure web app

The SQL console (see `docs/DESIGN.md`) connects **directly to a database** — a browser cannot
open a raw TCP connection to Postgres/MySQL/SQLite. That single requirement rules out a pure
web app and means the panel needs a real backend process with native DB drivers. Everything
below follows from that constraint.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Shell | **Electron** | Same foundation as real VS Code. Node.js main process gets direct access to DB drivers with no sidecar process needed. |
| UI | **React + TypeScript**, built with **Vite** | Matches the component/state model already proven in the prototype; fast dev loop. |
| Code/SQL editing | **Monaco** (the actual VS Code editor component) | Real syntax highlighting for the SQL console and any raw JSON/code fields, instead of a plain textarea. |
| State management | **Zustand** | Lightweight global store for open tabs, active site, connections — no Redux ceremony needed for a solo project. |
| DB access (SQL console) | **Node drivers per engine** (`pg`, `mysql2`, `better-sqlite3`) running in the Electron main process, exposed to the renderer via `contextBridge`/IPC | Implements the "connect directly to the DB" decision locked in `docs/DESIGN.md`. |
| Content Admin API client | Plain `fetch` from the renderer | Outbound HTTPS only, to sites the user controls — no special handling needed. |
| Secrets (API keys, DB credentials) | Electron's built-in **`safeStorage`** | OS-backed encryption, no extra native dependency (skips keytar). |
| Local app state (layout, recent sites, open tabs) | **electron-store** | Simple JSON persistence for non-secret settings only. |
| Packaging | **electron-builder** | Produces a Windows installer for the primary dev machine. |

## Rejected alternative: Tauri

Tauri (Rust backend + OS webview) was considered for its smaller binary size and lower memory
use. Rejected because the SQL console's DB layer would either need a Rust rewrite (`sqlx`) or a
Node sidecar process anyway, adding complexity without a clear payoff for a personal, single-user
tool where dev speed matters more than binary size. Revisit only if resource usage becomes a real
problem in practice.

## Notes

- DB credentials and per-site API keys are two separate secret categories in `safeStorage` — do
  not conflate them (see `docs/DESIGN.md`'s open item on SQL console write safety / scoping).
- The Content Admin API is a protocol the panel speaks as a client; it does not dictate the tech
  stack of the sites implementing it. That's a per-site decision, out of scope here.
