# Cookbook

Cookbook is a local-first recipe app and a software experimentation project focused on how recipe data can be stored, searched, and moved between backends over time. Today it uses Obsidian-friendly markdown files and a local SQLite-style search index; future iterations are intended to explore SQL storage, cloud-backed storage, authentication, and cross-device recipe sync.

## Why this project exists

This project is intentionally more than a recipe organizer. It is also a place to learn and experiment with:

- local-first application design
- storage abstraction and backend portability
- canonical tagging and search workflows
- how an app can evolve from single-device storage to authenticated multi-device access

## Current capabilities

- Import recipes from websites, photos, text files, or manual entry
- Review and edit extracted recipe drafts before saving
- Organize recipes with canonical taxonomy tags
- Search, filter, group, and randomly select recipes locally
- Manage taxonomy categories, tags, and aliases over time

## Quickstart

```bash
npm install
npm run dev
```

Then validate the project with:

```bash
npm run typecheck
npm run test
```

## Current architecture

- **Frontend:** React + TypeScript + Vite
- **Current recipe storage:** Obsidian-friendly markdown-style recipe files
- **Current local search:** `sql.js`-backed in-browser SQLite index
- **Desktop shell:** Tauri support is present, with the app currently centered around the TypeScript codebase

The current setup is designed to keep storage concerns isolated so the project can later expand into SQL-backed and cloud-backed implementations without rewriting the whole app.

## Project direction

Planned future iterations include:

- SQL-based storage adapters
- cloud-backed recipe persistence
- authentication and user accounts
- cross-device sync so a user can access the same recipes from different computers

## Project structure

- `src/` — application UI, state, and domain logic
- `src/lib/` — recipe models, extraction, taxonomy, persistence, selectors, and search index logic
- `src/components/` — UI components and workspaces
- `src/context/` — shared app state and context providers
- `src-tauri/` — thin desktop wrapper and Tauri configuration
- `tests/` — unit and UI-focused test coverage

## Scripts

- `npm run dev` — start the Vite development server
- `npm run build` — type-check and build the frontend bundle
- `npm run preview` — preview the production build
- `npm run typecheck` — run TypeScript checks without emitting files
- `npm run test` — run the Vitest suite
- `npm run tauri dev` — run the desktop shell in development once Tauri prerequisites are installed

## Limitations today

- Photo import is still early and does not yet provide full OCR/vision extraction
- Website import depends on available page metadata and parsing quality
- Storage is currently local-first, with broader backend support still to come
