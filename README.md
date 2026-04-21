# Saucer

Saucer is a personal recipe manager built to run everywhere — as a native desktop app or in any modern browser — with recipes kept in sync across all of them through a self-hosted backend. It works fully offline and syncs automatically when a connection is available.

## Features

### Cross-platform storage
The app runs as a **Tauri desktop executable** or as a **web app** deployed to any static host (Cloudflare Pages, etc.). The storage backend is selected automatically at startup:

| Environment | Local storage |
|-------------|--------------|
| Tauri desktop | Obsidian-style `.md` files in `~/.config/saucer/` via Rust IPC |
| Browser | IndexedDB (structured, survives page reloads, no size limit) |

The `RecipeStore` interface (`src/lib/persistence/`) abstracts the backend so the sync layer, UI, and search index are unaware of where data is physically stored.

### Server sync with PostgreSQL
A self hosted Express server backed by PostgreSQL keeps recipes in sync across every device and platform. The protocol is cursor-based and mutation-driven:

- Each client tracks a "cursor" representing the last change it has seen.
- Local writes generate named mutations (`upsertRecipe`, `deleteRecipe`) that are pushed to `/api/sync/push`.
- Clients poll `/api/sync/changes?cursor=…` every 10 seconds (and on window focus) to pull changes from other devices.
- The server deduplicates mutations by `clientMutationId`, so an offline client that reconnects and replays its queue never creates duplicates.
- A stable `X-Client-Id` (UUID in localStorage) tracks per-device sync state so the server does not echo a client's own mutations back to it.

### Recipe import using Claude API calls with internal fallback parsing
Recipes can be imported from four sources:

| Source | Primary extraction | Fallback |
|--------|--------------------|---------|
| Website URL | Cloudflare Worker fetches HTML; structured-data (`ld+json`) parser extracts recipe | — |
| Photo / image | Server calls LLM vision API (`/api/extract-photo`) | Tesseract.js attempts to parse image contents locally |
| Text file | Server calls LLM text API (`/api/extract-recipe-text`) | Internal plain-text parser |
| Manual entry | Full form immediately | — |

The LLM paths run server-side (keeping API keys off the client). The internal text parser handles plain ingredient lists and numbered instruction steps without any API call, so the app degrades gracefully when the server is unreachable.

### Text and tag search
Search runs entirely locally. `sql.js` provides full SQL semantics. The index is rebuilt from the local recipe store on every load and kept in memory.

### Conflict handling with offline use
The app is fully usable without a network connection. Writes go to local storage immediately and are queued as mutations for when the server is next reachable. With the scope of this project, extremely robust and lossless conflict handling is overkill, as the likelyhood two users on the same account are dealing with data at the same time is extremely low.

Regardless, there are 2 implemented constraints prevent data loss:

#### Deletion guard
A synced recipe cannot be deleted while offline. If a client is disconnected and the recipe exists on the server (i.e. it is not a local only draft), the delete is blocked with an error message.

#### Concurrent edit recovery
If two clients edit the same recipe while both are offline, both will push `upsertRecipe` mutations when they reconnect. The server applies them in arrival order, so whichever arrived last will persist. The losing client receives the server's authoritative version on its next `pullChanges` poll and its local copy is updated automatically. 

Example timeline:
```
Device A (offline)   Device B (offline)   Server
─────────────────    ─────────────────    ──────
edit "Pasta"         edit "Pasta"
  rating → 4           title → "Pasta 2.0"
     │                    │
     └── reconnects first ──▶  upsert received → revision 5 stored
                          │
                          └── reconnects second ─▶  upsert received → revision 6 stored
                                                     (title "Pasta 2.0", rating 4 from A overwritten)
     │
     └── next pullChanges ────▶  receives revision 6
         local copy updated to "Pasta 2.0"
```
Both devices converge to the same state within one poll cycle (~10 s) of the second client reconnecting.

## Architecture

```
Browser or Tauri app (React 19 + TypeScript + Vite)
        │
        │  HTTPS  (api.tobymcguire.net)
        ▼
   nginx (TLS termination)
        │
        ▼
  Express API server ──────────────────────────────────▶ Claude Haiku (OCR, LLM recipe parsing)
  ├── /api/sync/*       cursor-based mutation sync
  ├── /api/bootstrap    full initial sync on first connect
  ├── /api/extract-photo     LLM image extraction
  ├── /api/extract-recipe-text  LLM text extraction
  └── /api/taxonomy     taxonomy read/write
        │
        ▼
   PostgreSQL (recipes, mutations, sync cursors, taxonomy)
        │
        ▼
    AWS S3 (hero images)
```

**Frontend** (`src/`) — React 19 + TypeScript + Vite. State in Zustand stores under `src/features/`. Domain logic (models, taxonomy, persistence, search) in `src/lib/`.

**Desktop shell** (`src-tauri/`) — Tauri 2 wrapper. Three Rust IPC commands: `load_vault_snapshot`, `replace_vault_snapshot`, `fetch_recipe_page`. All business logic is TypeScript.

**Persistence layer** (`src/lib/persistence/`) — Three files:
- `index.ts` — `RecipeStore` interface, `VaultSnapshot` type, shared serialization (`parseRecipeMarkdown`, `serializeRecipe`), and helpers used by both stores.
- `obsidianStore.ts` — `ObsidianRecipeStore`: Tauri filesystem path and localStorage fallback.
- `indexedDbStore.ts` — `IndexedDbRecipeStore`: IndexedDB via `idb`, one record per recipe.

**Sync layer** (`src/features/sync/`) — `useSyncStore` orchestrates bootstrap, incremental pull, and mutation push. `useSyncEffect` wires it to the auth state and sets up polling intervals.

**Sync server** (`server/`) — Express with `FileAppStore` (JSON, dev) and `PostgresAppStore` (production). Cursor-based, deduplicates by `clientMutationId`.

**Auth** — AWS Cognito issues JWTs via OIDC. Server verifies with `aws-jwt-verify`. Sync is optional — the app works without authentication, but changes stay local only.

**Search** — `sql.js` (SQLite/WASM) runs full-text search in-process with no server dependency.

## Quickstart (frontend only)

```bash
npm install
npm run dev        # Vite dev server on localhost:1420 (browser, uses IndexedDB)
npm run tauri dev  # Full desktop app (requires Rust toolchain)
```

Validate before committing:

```bash
npm run typecheck
npm run test
npm run build
```

## Sync server (local development)

```bash
cd server
npm install
npm run dev        # Express server on localhost:3001 (uses FileAppStore)
```

Set `VITE_API_URL=http://localhost:3001` in `.env` to point the frontend at the local server.

## Sync server (production)

The production server currently runs at `api.tobymcguire.net` via Docker Compose. It requires:

- PostgreSQL (managed by Docker Compose)
- AWS Cognito credentials for JWT verification
- AWS S3 credentials for hero image storage
- TLS certificate from Let's Encrypt (via certbot + Cloudflare DNS plugin)

## Project structure

```
src/
  features/         Zustand stores, sync hooks, auth, import flows
  lib/
    persistence/    RecipeStore interface + ObsidianStore + IndexedDbStore
    searchIndex.ts  SQLite/WASM full-text search
    taxonomy.ts     Tag normalization, aliases, fuzzy matching
    apiClient.ts    Typed HTTP client for the sync server
  components/       Workspace views and UI components
src-tauri/          Tauri configuration and Rust IPC commands
server/
  src/              Express app, AppStore interface, PostgresAppStore
  Dockerfile        Multi-stage Node 22 build
  docker-compose.yml  PostgreSQL + Express + nginx
  nginx.conf        TLS reverse proxy config
  SETUP.md          Full deployment and migration guide
tests/              Vitest unit + integration tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (browser mode, IndexedDB storage) |
| `npm run tauri dev` | Full desktop app in development |
| `npm run build` | Type-check + build frontend bundle |
| `npm run typecheck` | TypeScript validation only |
| `npm run test` | Vitest suite |
| `cd server && npm run dev` | Local sync server (port 3001) |
| `cd server && docker compose up -d --build` | Production server via Docker |
