# Goal

Build 简清 / Clearlist, an independently implemented MIT-licensed alternative to Todo清单. Start with a working offline Windows desktop app and a shared browser UI. Reference the installed client only to understand observable features and workflows.

# Current State

- Version 0.1.0 created 2026-10-19. Electron + React + TypeScript; local JSON data with validation and recoverable backups.
- Implemented tasks, lists, tags, notes, subtasks, date/priority, repeats, calendar drag, quadrants, focus/rest timers, statistics, trash/restore, JSON merge import/export and light/dark/system themes.
- 17 domain/storage tests, 5 browser workflow tests and desktop process checks passed. Windows x64 portable artifact is generated under `release/`; actual user workflow acceptance remains pending.
- The original Todo清单 installation, account, databases, assets and services must remain untouched.
- Reference findings: `docs/design/reference-analysis.md`. No extracted proprietary source/assets may enter this repository.
- No GitHub remote has been configured. Local source is prepared for public release under MIT.

# Active Work

- First offline release complete; collect the user's actual workflow feedback before expanding.
- Sync, mobile packages, attachments and original-app data migration are outside the initial release.

# Build / Run / Test

- Node.js 24 LTS; `npm ci` installs project-local dependencies.
- `npm run dev`: Vite + Electron, dedicated Clearlist profile.
- `npm run dev:web`: browser UI on `http://127.0.0.1:5178`.
- `npm run format:check`, `npm run check`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:desktop`.
- `npm run dist:win`: portable x64 package in `release/`.
- `npm run test:portable`: after packaging, verify actual single-file launcher startup, task write and window close with isolated data.
- Electron smoke tests must use `CLEARLIST_DATA_DIR` under a dedicated temporary directory, never the user's live profile.

# Durable Lessons

- Read the storage design before modifying persistence/import. A corrupt store must never be silently replaced by an empty state.
- Electron 44 downloads its runtime lazily; on this machine the downloader needed `ELECTRON_GET_USE_PROXY=1` to use the already-configured proxy. Scope it to the build process.
- `signAndEditExecutable=false` suppresses icon and metadata updates as well as signing. Use `signExecutable=false` for unsigned preview builds with the correct application icon.
- Browser production dependencies are bundled by Vite; only Zod is needed as a runtime node module in the desktop archive.
- The default electron-builder 26.15.3 ZIP extraction path repeatedly failed with EPERM on the final directory rename here. `scripts/package-windows.mjs` reuses the project's installed runtime through the supported `electronDist` option, avoiding duplicate extraction. The underlying Windows handle owner was not identified.

# Docs Index

- `docs/design/reference-analysis.md`: version-specific read-only reference findings and feature scope.
- `docs/design/storage.md`: data model, durable writes, recurrence and timer behavior.
- `docs/verification.md`: checked behavior, environment and unverified release boundaries.
