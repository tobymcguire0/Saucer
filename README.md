# Saucer

Saucer is a recipe app built for personal use across multiple devices. It runs as a Tauri desktop app with a React frontend and syncs recipes through a self-hosted Express server at `api.tobymcguire.net`. Recipes are stored locally as Obsidian-style markdown files and kept in sync via a PostgreSQL-backed revision system.

## Capabilities

- Authenticate through AWS Cognito hosted sign-in
- Import recipes from websites, photos, text files, or manual entry
- Review and edit extracted recipe drafts before saving
- Organize recipes with canonical taxonomy tags
- Search, filter, group, and randomly select recipes
- Sync recipes across devices via the self-hosted backend

## Architecture

```
Desktop app (Tauri + React)
        │
        │  HTTPS  (api.tobymcguire.net)
        ▼
   nginx (TLS termination)
        │
        ▼
  Express API server
        │
        ▼
   PostgreSQL (recipe store, sync cursors, mutation log)
        │
        ▼
    AWS S3 (hero images)
```

**Frontend** (`src/`) — React 19 + TypeScript + Vite. State lives in Zustand stores under `src/features/`. Shared domain logic (models, taxonomy, persistence, search) lives in `src/lib/`.

**Desktop shell** (`src-tauri/`) — Tauri 2 wrapper. Exposes three IPC commands: `load_vault_snapshot`, `replace_vault_snapshot`, and `fetch_recipe_page`. All business logic is in TypeScript.

**Sync server** (`server/`) — Express app with two storage backends: `FileAppStore` (JSON file, for development) and `PostgresAppStore` (production). Implements a cursor-based mutation sync protocol: clients push named mutations and pull changes since a cursor. The server deduplicates mutations by `clientMutationId` so offline edits sync correctly without duplicates.

**Auth** — AWS Cognito issues JWTs to the desktop app via OIDC. The server verifies them with `aws-jwt-verify`. The `X-Client-Id` header (a UUID stored in localStorage) tracks per-device sync state.

**Local storage** — Recipes are Obsidian-style `.md` files in `~/.config/saucer/`. The `RecipeStore` interface (`src/lib/persistence.ts`) abstracts this so the storage backend can be swapped without touching UI code.

**Search** — `sql.js` (SQLite compiled to WASM) runs full-text search entirely in-process with no server round-trip.

## Quickstart (frontend only)

```bash
npm install
npm run dev        # Vite dev server on localhost:1420
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

The production server runs at `api.tobymcguire.net` via Docker Compose. It requires:

- PostgreSQL (managed by Docker Compose)
- AWS Cognito credentials for JWT verification
- AWS S3 credentials for hero image storage
- TLS certificate from Let's Encrypt (via certbot + Cloudflare DNS plugin)

See **`server/SETUP.md`** for full deployment, DNS, router, and migration instructions.

## Environment variables

Copy `.env.example` to `.env` and fill in values. Required variables:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | Frontend build | Sync server URL (`https://api.tobymcguire.net` in prod) |
| `VITE_COGNITO_REGION` | Frontend | Cognito region |
| `VITE_COGNITO_USER_POOL_ID` | Frontend | Cognito user pool |
| `VITE_COGNITO_CLIENT_ID` | Frontend | Cognito app client |
| `VITE_COGNITO_DOMAIN` | Frontend | Cognito hosted UI domain |
| `COGNITO_USER_POOL_ID` | Server | JWT verification |
| `COGNITO_CLIENT_ID` | Server | JWT verification |
| `POSTGRES_*` | Server | Database connection |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Server | S3 image uploads |
| `S3_BUCKET_NAME` | Server | Hero image bucket |

## Project structure

```
src/
  features/       Zustand stores, sync hooks, auth, import flows
  lib/            Models, persistence, taxonomy, search, API client
  components/     Workspace views and UI components
src-tauri/        Tauri configuration and Rust IPC commands
server/
  src/            Express app, AppStore interface, PostgresAppStore
  Dockerfile      Multi-stage Node 22 build
  docker-compose.yml  PostgreSQL + Express + nginx
  nginx.conf      TLS reverse proxy config
  SETUP.md        Full deployment and migration guide
tests/            Vitest unit tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run tauri dev` | Full desktop app in development |
| `npm run build` | Type-check + build frontend bundle |
| `npm run typecheck` | TypeScript validation only |
| `npm run test` | Vitest suite |
| `cd server && npm run dev` | Local sync server (port 3001) |
| `cd server && docker compose up -d --build` | Production server via Docker |
