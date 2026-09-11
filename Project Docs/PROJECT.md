# Project

## Overview

A single, personal-use admin panel that can manage content on any website the owner builds — instead of building a one-off admin UI per project, this panel is built once, and every future site exposes a shared API contract so the panel can manage it. Visually and interactively, the panel is modeled on the **VS Code** interface (tree explorer, tabs, command palette, status bar) rather than a typical boxy CRUD admin UI.

No production code exists yet. The project has a locked product design and a working visual prototype (a mock frontend only, not a real backend). The technology stack was originally locked around an Electron desktop app, then **revised 2026-09-08** to a browser-based web app (frontend + backend server), deployed on Render — see `ARCHITECTURE.md` for what actually exists and `DECISIONS.md` for the full reasoning and decision history.

## Problem

Every website the owner builds (e.g. the Portfolio project, client sites) ends up needing its own bespoke admin/CMS UI, built and maintained separately per project. This duplicates effort and produces inconsistent admin experiences across sites.

## Purpose

Build one admin panel, once, that can manage content across many different sites — as long as each site's backend implements a shared "Content Admin API" contract — plus give the owner a direct SQL console for personal database work that doesn't need to go through that contract.

## Goals

- One reusable admin panel UI, not rebuilt per site.
- A **Content Admin API** protocol (auth, list collections, get a collection's schema, CRUD on records, media upload/listing, search) that any backend can implement, so the panel can render the right editor for any content type without site-specific frontend code — schema-driven, the same trick LSP uses to let one editor support many languages.
- A VS Code-styled interface: activity bar for switching sites/modules, an explorer tree for a site's collections/records, editor tabs for open records, a command palette for quick actions, a status bar for connection/save state.
- A dedicated **SQL query console** for direct, personal database access, styled after VS Code's database-extension UX (table chips, query input, real result grid).

## Non-Goals

- Not a multi-tenant SaaS product — personal-use, single-operator tool for now. Trust-boundary decisions (e.g. the SQL console bypassing the Content Admin API) are made specifically in that context and should not be assumed to hold if the tool's audience ever changes. Going browser-based (see `DECISIONS.md`) already required adding real login auth that wasn't needed for a desktop-only app; a full multi-account/admin-policy system is a stated future direction (see Core Features) but explicitly not current scope.
- Not a scraper or per-CMS-platform tool in its first version. Adapters translating third-party platforms (WordPress, Shopify, etc.) into the Content Admin API contract are a possible future extension, not required for v1 — the primary target is sites the owner builds and controls, implementing the contract natively.
- Not a client-only, backend-less web app — the SQL console needs a real backend process with native DB drivers (a browser cannot open a raw TCP connection to Postgres/MySQL/SQLite). This is why the browser-based pivot (see `DECISIONS.md`) still includes a dedicated backend server, not just a static frontend.

## Target Users

The project owner, personally — as the operator managing content across their own sites and personal databases. Currently gated by a single-user login (owner only). The owner has flagged a future direction where an Admin can create additional "agent" accounts under some policy system — deferred to **Version 2**, not designed and not current scope — only the login flow is being built for now (see `DECISIONS.md`, `TASKS.md`).

## Core Features

- Login flow: single-user authentication gating the whole panel (current scope — see `DECISIONS.md`). **Version 2 (future direction, not current scope):** an Admin role able to create additional "agent" accounts under some policy system — noted here as intent only, not designed, not to be built until asked for.
- Content Admin API client: auth, collection listing, schema-driven CRUD forms, media upload/listing, search — across any site implementing the contract. Image and Video are real, first-class schema field types (not just a narratively-mentioned "image picker") — see `DECISIONS.md`.
- VS Code-metaphor UI: activity bar, explorer sidebar, editor tabs, command palette, status bar, split panes.
- Staging layer for data-management edits (assigned to [Phase 23], not yet built): edits made through the schema-driven Content Admin API path are held as drafts in AdminPanel rather than written straight to a target site's live database, with the split-pane UI (`Phase 22`) used to compare a draft against its live counterpart before an explicit "deploy" step applies it — see `DECISIONS.md`'s "Staging layer for data-management edits, deployed to live on demand" entry. Deliberately does **not** apply to the SQL Console, which keeps its own existing read-only-by-default/confirm-to-write model.
- SQL console: direct DB connection per site, table chips, query input, result grid — a deliberate, explicit exception to the schema-driven CRUD path (see `DECISIONS.md`). Current scope (Phase 0–31): databases reachable **locally, on the same machine/disk** as AdminPanel itself only — a genuinely remote/production database (e.g. a hosted Neon instance) is Version 2, see below.

**Version 2 (future direction, not current scope):** a "Generate Connection" capability — an API/UI to register a new site's database connection at runtime (submit its host/port/credentials, get back a usable connection), replacing [Phase 7]'s static, hardcoded-per-site approach (a fixed id added to a code-level list, credentials added to `.env.local`, backend restarted). Also Version 2: connecting to a site's genuinely **remote/production** database (e.g. Portfolio's Neon Postgres) rather than only a database reachable locally — the current roadmap (Phase 0–31) restricts both the SQL Console (Phase 5) and its Phase 7 remote-site extension to databases on the same machine/disk as AdminPanel itself (AdminPanel's own local test databases, and other local sites' local dev databases); a real network hop to a hosted production database is explicitly out of scope until Version 2. Noted here as intent only — see `DECISIONS.md`'s "Generate Connection API deferred to Version 2" entry. Not assigned to any phase in the locked Phase 0–31 roadmap (`PHASES.md`) and not to be built until asked for.

The existing design canvas prototype (`design/master-admin-panel.html`) demonstrates the intended visual/interaction design as a mock frontend only — no real API calls, no real DB connection, no production backend. See `ARCHITECTURE.md`.

## Current Status

Design, stack, and the full build roadmap are all locked (Phase 0 through Phase 31, see `PHASES.md`); no production implementation has started yet. `PHASES.md` is itself locked against unprompted edits — only the project owner (Admin) adds or changes phases from here.

## Constraints

- Must support direct database connections (Postgres/MySQL/SQLite drivers) from a backend the panel controls — see `DECISIONS.md`'s stack reasoning.
- Browser-based, hosted on Render's free tier with an UptimeRobot keep-alive monitor (see `DECISIONS.md`, `ARCHITECTURE.md`) — no desktop packaging target anymore.
- Must have real authentication in front of it (a login gate), since it's reachable over the network rather than only launchable on the owner's own machine — see `DECISIONS.md`.

## Scope

A single-owner, personal admin tool spanning potentially many managed sites/databases — not a multi-tenant or multi-user product.

## Success Criteria

Every phase in the locked roadmap (`PHASES.md`) carries its own completion criteria, from local database setup through live-deployment end-to-end verification (Phase 31). No project-wide success criteria beyond "the roadmap's phases are all complete" have been separately defined.
