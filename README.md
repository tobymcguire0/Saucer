# Saucer

Saucer is a local-first recipe app and experimentation project for recipe storage, taxonomy management, and backend portability. Today it authenticates with Cognito/OIDC, persists an Obsidian-friendly recipe snapshot locally, and keeps shared frontend state in focused Zustand stores and feature-scoped view-model hooks.

## Why this project exists

This project is intentionally more than a recipe organizer. It is also a place to learn and experiment with:

- local-first application design
- storage abstraction and backend portability
- canonical tagging and search workflows
- authenticated flows that can later grow into multi-device sync

## Current capabilities

- Authenticate through Cognito hosted sign-in
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
npm run build
```

## Frontend architecture

- **Root-global auth:** `react-oidc-context` plus Cognito helpers in `src/features/auth/`
- **Shared app state:** Zustand stores under `src/features/*/use*Store.ts`
- **Render-path composition:** app shell and workspace surfaces compose feature view-model hooks directly
- **Shared domain/adapters:** `src/lib/` holds models, taxonomy logic, extraction primitives, persistence adapters, and selectors
- **Feature boundaries:** `src/features/` owns UI orchestration, auth/bootstrap flows, import validation, and persistence wiring

## Runtime and storage

- **Frontend:** React + TypeScript + Vite
- **Desktop shell:** Tauri
- **Persistence:** Obsidian-style markdown snapshot handled by `src/lib/persistence.ts`
- **Local search/filtering:** selector-driven in-memory filtering and grouping

The current setup keeps persistence and extraction isolated so the project can evolve toward richer local or cloud-backed storage without rewriting the app shell.

## Auth configuration

Provide these Vite environment variables before running the authenticated app:

- `VITE_COGNITO_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`

## Project direction

Planned future iterations include:

- additional storage adapters
- cloud-backed recipe persistence
- cross-device sync
- richer import/extraction pipelines

## Project structure

- `src/features/` — Zustand stores, feature hooks, view-models, and feature-specific boundaries
- `src/lib/` — shared domain logic and platform adapters
- `src/components/` — presentational components and workspace shells
- `src/styles/` — shared styling for the app shell and feature surfaces
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
