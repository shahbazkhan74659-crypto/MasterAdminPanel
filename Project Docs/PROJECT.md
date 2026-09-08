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

The project owner, personally — as the operator managing content across their own sites and personal databases. Currently gated by a single-user login (owner only). The owner has flagged a future direction where an Admin can create additional "agent" accounts under some policy system, but this is **not designed and not current scope** — only the login flow is being built for now (see `DECISIONS.md`, `TASKS.md`).

## Core Features

- Login flow: single-user authentication gating the whole panel (current scope — see `DECISIONS.md`). Future, not-yet-designed direction: an Admin role able to create additional "agent" accounts under some policy system — noted here as intent only, not to be built until asked for.
- Content Admin API client: auth, collection listing, schema-driven CRUD forms, media upload/listing, search — across any site implementing the contract.
- VS Code-metaphor UI: activity bar, explorer sidebar, editor tabs, command palette, status bar, split panes.
- SQL console: direct DB connection per site, table chips, query input, result grid — a deliberate, explicit exception to the schema-driven CRUD path (see `DECISIONS.md`).

The existing design canvas prototype (`design/master-admin-panel.html`) demonstrates the intended visual/interaction design as a mock frontend only — no real API calls, no real DB connection, no production backend. See `ARCHITECTURE.md`.

## Current Status

Design and stack locked; no production implementation has started. See `PHASES.md` and `TASKS.md`.

## Constraints

- Must support direct database connections (Postgres/MySQL/SQLite drivers) from a backend the panel controls — see `DECISIONS.md`'s stack reasoning.
- Browser-based, hosted on Render's free tier with an UptimeRobot keep-alive monitor (see `DECISIONS.md`, `ARCHITECTURE.md`) — no desktop packaging target anymore.
- Must have real authentication in front of it (a login gate), since it's reachable over the network rather than only launchable on the owner's own machine — see `DECISIONS.md`.

## Scope

A single-owner, personal admin tool spanning potentially many managed sites/databases — not a multi-tenant or multi-user product.

## Success Criteria

To be defined — no phases or completion criteria have been set yet beyond the design/stack lock. See `PHASES.md`.
