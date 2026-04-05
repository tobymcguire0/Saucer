# Repository Guidelines

## Project Structure & Module Organization
Keep project-wide files at the root and place application code in `src/`, tests in `tests/`, and desktop shell code in `src-tauri/`. Shared recipe, taxonomy, extraction, and storage logic belongs under `src/lib/`. Static assets should stay in `public/` or `src/assets/`.

## Build, Test, and Development Commands
Use the standard npm entry points:

- `npm install` — install frontend dependencies
- `npm run dev` — start the Vite UI
- `npm run typecheck` — run TypeScript checks without emitting files
- `npm run test` — run the Vitest suite in `tests/`
- `npm run build` — type-check and build the frontend bundle
- `npm run tauri dev` — run the desktop shell once Rust/Tauri prerequisites are installed

## Coding Style & Naming Conventions
Use TypeScript with strict typing and React function components. Prefer small focused modules and keep domain logic outside UI components when practical. Follow:

- `PascalCase` for React components and types
- `camelCase` for variables and functions
- `kebab-case` for filesystem folder names
- descriptive names over abbreviations

Keep formatting consistent with the surrounding file and avoid unnecessary comments.

## Testing Guidelines
Add automated tests for parsing, tagging, storage, and filtering behavior. Put unit tests in `tests/` and name them after the behavior under test, for example `tests/taxonomy.test.ts`. Prefer deterministic fixtures over network calls and mock browser-only APIs when needed.

## Commit & Pull Request Guidelines
Follow the existing style of short, imperative commit messages, such as `Add recipe taxonomy manager`. Pull requests should summarize the change, explain why it was made, list validation commands run, and include screenshots for notable UI changes.

## Security & Configuration Tips
Never commit secrets, `.env` files, or generated build artifacts. Treat imported recipe content as untrusted input: sanitize extracted fields, validate URLs before fetching, and keep storage adapters isolated behind interfaces so backend changes stay low-risk.