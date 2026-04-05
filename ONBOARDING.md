# New Engineer Onboarding

## Product at a Glance
Cookbook is a desktop-first recipe aggregator built with React, TypeScript, Vite, and Tauri. Users can import recipes from websites, photos, text files, or manual entry, review the extracted data, save recipes locally, search and filter by canonical tags, and manage taxonomy over time.

## First-Day Setup
1. Install Node.js and npm.
2. Install project dependencies:
   - `npm install`
3. Install Rust/Tauri prerequisites for desktop work:
   - `rustup`, `cargo`, `rustc`
   - Visual Studio C++ Build Tools on Windows
4. Validate your environment:
   - `cargo --version`
   - `npm run typecheck`
   - `npm run test`

Use `npm run dev` for the web UI and `npm run tauri dev` once Rust is available.

## Important Commands
- `npm run dev` — starts the Vite app on port `1420`
- `npm run typecheck` — runs TypeScript validation
- `npm run test` — runs the Vitest suite in `tests/`
- `npm run build` — builds the frontend bundle
- `npm run tauri dev` — launches the desktop shell

## Codebase Map
- `src/App.tsx` — main UI orchestration and app state
- `src/lib/models.ts` — shared domain types
- `src/lib/defaultTaxonomy.ts` — seeded categories and canonical tags
- `src/lib/taxonomy.ts` — tag matching, aliasing, merging, suggestion logic
- `src/lib/extraction.ts` — website/text/photo draft extraction
- `src/lib/persistence.ts` — Obsidian-style markdown persistence
- `src/lib/searchIndex.ts` — SQLite-backed local search index via `sql.js`
- `src/lib/selectors.ts` — filtering, grouping, random recipe selection
- `src/lib/seedData.ts` — starter recipes for local development
- `src-tauri/` — thin desktop wrapper and config
- `tests/` — unit coverage for extraction, taxonomy, persistence, and selectors

## How Data Flows
1. Import creates a `RecipeDraft`.
2. Extraction and taxonomy logic propose canonical tags.
3. The review form lets the user edit fields and tag assignments.
4. Saving converts the draft into a `Recipe`.
5. Recipes are serialized as markdown-like Obsidian notes in local storage.
6. A SQLite sidecar index is rebuilt for fast querying.

## Storage Model
The current implementation is local-first:
- canonical recipe storage is emulated as Obsidian-style markdown in browser `localStorage`
- search/filtering uses a separate SQLite index stored locally

This keeps the app modular while leaving room for a future filesystem-backed Obsidian vault or cloud adapter.

## Taxonomy Rules
Tags are organized under categories. Recipes store canonical tag IDs, not raw strings. New aliases should map near-duplicate terms back to an existing canonical tag when possible. Example: `spaghetti` and `sphagetti` should resolve to `Pasta` unless the team intentionally introduces a more specific canonical tag.

## Current Constraints
- Photo import is placeholder-level; it stores the image but does not yet do real OCR/vision extraction.
- Website import prefers JSON-LD and then falls back to text parsing, so some sites may fail due to CORS or inconsistent markup.
- The Tauri side is minimal; most business logic is in TypeScript.

## Design Reference
Initial wireframes live in Figma: [Cookbook UX Wireframes](https://www.figma.com/design/mN7rU80AQ7di7qan2Ceyqf)

## Recommended Reading Order
1. `AGENTS.md`
2. `src/App.tsx`
3. `src/lib/models.ts`
4. `src/lib/persistence.ts`
5. `src/lib/searchIndex.ts`
6. `src/lib/taxonomy.ts`
7. `tests/`

## Before Opening a PR
Run:
- `npm run typecheck`
- `npm run test`

If you touched build-related behavior, also run `npm run build`.
