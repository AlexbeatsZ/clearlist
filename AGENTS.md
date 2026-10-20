# Goal

Build 简清 / Clearlist, an independently implemented MIT-licensed alternative to Todo清单. Start with a working offline Windows desktop app and a shared browser UI. Reference the installed client only to understand observable features and workflows.

# Current State

- Version 0.2.0, 2026-10-19. Electron + React + TypeScript and Capacitor Android; v1 JSON remains compatible.
- Implemented tasks, lists, tags, notes, subtasks, date/priority, repeats, calendar drag, quadrants, focus/rest timers, statistics, trash/restore, JSON merge import/export and light/dark/system themes.
- 30 domain/storage/API tests, 7 browser workflows, desktop persistence, UI/API/CLI and final Windows EXE checks passed. Mac arm64/Intel final apps passed on CI, arm64 also on the physical Mac; Android release build/lint/signature passed. Physical Android acceptance remains pending.
- The original Todo清单 installation, account, databases, assets and services must remain untouched.
- Reference findings: `docs/design/reference-analysis.md`. No extracted proprietary source/assets may enter this repository.
- Public repository: `https://github.com/AlexbeatsZ/clearlist`; `origin` uses HTTPS and `main` is the publishing branch. User authorized public GitHub publication on 2026-10-19.
- Public release `v0.2.0` is built from `9e8f010`; all four jobs in GitHub Actions `39362864928` passed. Nine uploaded assets: Windows EXE, Android APK, Mac arm64/Intel DMG+ZIP, source ZIP and AI client/OpenAPI. Remote names/sizes match local files; release is non-draft/non-prerelease. Retain v0.1.0 tag/history.

# Active Work

- v0.2.0 user acceptance: Android installation/native file pickers/back/system bars; Mac downloaded Gatekeeper flow; long-running focus/notification behavior. These are separate from the passed build and automated process checks.
- Preserve v1 task data and the installed Windows profile. Android uses an independent app-private data directory; transfer via JSON remains explicit.
- Sync, attachments, iOS packaging and original-app data migration are outside this release.

# Build / Run / Test

- Node.js 24 LTS; `npm ci` installs project-local dependencies.
- `npm run dev`: Vite + Electron, dedicated Clearlist profile.
- `npm run dev:web`: browser UI on `http://127.0.0.1:5178`.
- `npm run format:check`, `npm run check`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:desktop`.
- `npm run dist:win`: portable x64 package in `release/`.
- `npm run test:portable`: after packaging, verify actual single-file launcher startup, task write and window close with isolated data.
- `npm run test:api`: real desktop UI/API/CLI integration in an isolated temporary profile.
- `npm run dist:android`: existing Java 21 + Android SDK; signing in ignored `.local/android-signing/`, Gradle cache isolated in `.local/gradle/`. Preserve signing keys for upgrades; never publish `.local/`.
- `npm run dist:mac`: on macOS, DMG/ZIP for current architecture; append `-- x64` for Intel. Requires macOS 13+ at runtime. Packages are ad-hoc signed, not notarized.
- `npm run ai -- GET /health`: local API client; app must be running. Read `docs/api/README.md` before exposing integrations.
- Electron smoke tests must use `CLEARLIST_DATA_DIR` under a dedicated temporary directory, never the user's live profile.

# Durable Lessons

- Read the storage design before modifying persistence/import. A corrupt store must never be silently replaced by an empty state.
- Electron 44 downloads its runtime lazily; on this machine the downloader needed `ELECTRON_GET_USE_PROXY=1` to use the already-configured proxy. Scope it to the build process.
- `signAndEditExecutable=false` suppresses icon and metadata updates as well as signing. Use `signExecutable=false` for unsigned preview builds with the correct application icon.
- Browser production dependencies are bundled by Vite; only Zod is needed as a runtime node module in the desktop archive.
- The default electron-builder 26.15.3 ZIP extraction path repeatedly failed with EPERM on the final directory rename here. `scripts/package-windows.mjs` reuses the project's installed runtime through the supported `electronDist` option, avoiding duplicate extraction. The underlying Windows handle owner was not identified.
- In Playwright `expect.poll`, a thrown ENOENT ends the check immediately. When waiting for the first asynchronous data-file write, treat only ENOENT as "not ready" and return a sentinel; keep other read/parse failures fatal.

# Docs Index

- `docs/design/reference-analysis.md`: version-specific read-only reference findings and feature scope.
- `docs/design/storage.md`: data model, durable writes, recurrence and timer behavior.
- `docs/design/platforms.md`: Android native persistence, theme, mobile navigation and Mac lifecycle/signing.
- `docs/design/api.md`: authenticated loopback API, desktop state authority and field-level concurrency.
- `docs/api/README.md` / `openapi.json`: AI usage and machine-readable API contract.
- `docs/verification.md`: checked behavior, environment and unverified release boundaries.
- `docs/releases/v0.1.0.md`: public first-release notes.
- `docs/releases/v0.2.0.md`: dark/mobile/macOS/API release and acceptance boundaries.
