# Reliable route recording, GPX delivery and offline route bundle

## Objective and authorization
Deliver the v1 route lifecycle: plan -> record GPS -> generate GPX -> persist/upload GPX -> download a published route bundle (GPX + PMTiles) -> use it offline. The user authorized implementation. Do not use Firestore point chunks or raster tile caches. Preserve concurrent UI work. Main agent orchestrates; Luna high agents explore and verify.

## Scope and acceptance
- T1: Native GPX is a local file shared with the GPX MIME type; web keeps its download behavior.
- T2: GPS/state mutations are serialized; storage failures are visible; finishing persists locally before returning and does not wait for Firestore. Local history remains available offline and is user-scoped.
- T3: Assess planning restore and map-independent handoff; correct bounded blockers without overwriting concurrent UI changes.
- T4: Persist long tracks incrementally in SQLite with a bounded memory window, legacy recovery, and cleanup.
- T5: Store GPX bytes in Firebase Storage with Firestore metadata/status; upload activity GPX locally first and retry when online.
- T6: Define published route artifacts (GPX + PMTiles) and their Storage/Firestore contract without putting bytes in Firestore.
- T7: Replace the offline JSON snapshot with an atomic local GPX + PMTiles download manifest and consume it from the offline detail/map.
- T8: Add background GPS capture through Expo TaskManager/location updates and document development-build/device limits.
- T9: Verify each slice with pure tests, Firebase Emulator rules tests where available, lint, and truthful device gates.

## Workflow
- Branch: `codex/route-recording-bundle`; branch point: `e76c097`.
- Delivery: `ask-on-risk`; no push, PR or merge authorized. Forecast: approximately 900-1200 authored changed lines across the work units; remeasure before each commit. No code-golf to fit the heuristic.
- RDD: off, decided by default (`gentle-ai review mode status`). No native review will run.
- TDD: no explicit enabled/disabled project setting found. Do not claim strict TDD; add regression tests before fixes, with ordinary functional verification. Runner: `npx --no-install tsx` (cached 4.23.13).
- Tests must remain local; do not execute the umbrella suite against live Firestore.

## Tasks
- [x] T1 — Deliver native GPX files and validate serialization/attachment contract (commit ef71de3).
- [x] T2 — Preserve ordered GPS updates and finish locally without network waits (commit ef71de3).
- [x] T3 — Verify planning-to-recording recovery and document remaining limits (commit ef71de3).
- [x] T4 — Add incremental SQLite track storage and bounded in-memory recovery (SQLite repository, 300-point window, legacy autosave backfill, local cleanup; focused suites pass).
- [x] T5 — Add Firebase Storage GPX upload/download ports, metadata, rules, and retryable activity sync (local-first; no Firestore point chunks).
- [x] T6 — Add published route GPX/PMTiles artifact metadata and publication validation (this commit).
- [x] T7 — Implement atomic offline GPX + PMTiles bundle download and offline consumption (commit 15285bd).
- [ ] T8 — Implement background GPS capture and native permission/build configuration.
- [ ] T9 — Run verification matrix and update HU evidence without claiming unverified device behavior.

## Evidence
- Previous GPS/GPX slice is already merged into `main` through commits `ef71de3`, `e0effa3`, and `e76c097`.
- Baseline pure tests: all 10 local suites passed, including HU-01, HU-02, HU-06, HU-07, HU-08 (`npm test`).
- Lint status: `npm run lint` passing with 0 TypeScript errors.
- Lockfile cleanup: `pnpm-lock.yaml` deleted. Canonical package manager is npm.
- Expo Doctor status: `npx expo-doctor` passed 21/21 (100%).
- Device runtime harness: pending physical device tests for long-track endurance, PMTiles local range reads, Storage download, and background capture.
- T4 checks: `npx --no-install tsx src/tests/activity_track_db.test.ts`, `activity_record_sqlite.test.ts`, `activity_autosave_slim.test.ts`, and `activity_store.test.ts` all passed; `git diff --check` passed. `npm run lint` is blocked by the pre-existing missing `invariant` declaration in `expo-modules-core` after dependency installation.
- T5 checks: `npm test` passed (including the dynamic local filename → stable `activity.gpx` metadata regression), `npx --no-install tsx src/tests/activity_gpx_storage.test.ts` and `activity_store.test.ts` passed, `npx expo-doctor` passed 21/21, and `git diff --check` passed. `npm run lint`/`tsc --noEmit` remain blocked only by the pre-existing missing `invariant` declaration in `expo-modules-core`. Firebase Storage/Firestore emulator and physical-device proof were not run.
- T6 checks: `npx --no-install tsx src/tests/route_publication_artifacts.test.ts`, `map_pack_formats.test.ts`, `offline_hu4.test.ts`, `activity_gpx_storage.test.ts`, and `npm test` passed; `git diff --check` passed. `npm run lint` remains blocked only by the pre-existing missing `invariant` declaration in `expo-modules-core`. Firestore rules emulator and Storage upload proof were not run. T6 defines metadata-only paired publication (same version, exact Storage paths, MIME/size/hash/status) and leaves binary generation/download to T7.
- T7 checks: `npx --no-install tsx src/tests/offline_bundle.test.ts`, `npx --no-install tsx src/tests/offline_hu4.test.ts`, `npm test`, and `git diff --check` passed. The v2 manifest is committed only after both stable binary files are finalized; size/SHA/PMTiles magic validation and temp cleanup are covered by pure tests. `npm run lint` remains blocked only by the pre-existing missing `invariant` declaration in `expo-modules-core`. No Firebase Storage emulator or physical-device proof was run.

## Next step
Implement T4-T9 one work unit at a time. Do not mark HU-04/HU-08 complete until the binary bundle and background/device gates have evidence.
