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
- [x] T7 — Implement atomic offline GPX + PMTiles bundle download and offline consumption (commits 94eae6c, b6465ab, 04b55ea, 04a5b00).
- [x] T8 — Implement background GPS capture and native permission/build configuration (implementation commit 50b6179).
- [x] T9 — Run verification matrix and update HU evidence without claiming unverified device behavior (this commit).

## Evidence
- Previous GPS/GPX slice is already merged into `main` through commits `ef71de3`, `e0effa3`, and `e76c097`.
- Baseline local suite: the complete `npm test` command passed all configured HU-01…HU-08, persistence, GPX, PMTiles and background suites (15 sequential commands). It includes an existing Firestore connectivity smoke; no Firebase Emulator or live device proof was run as part of T9.
- T9 checks observed on 2026-09-22: `npm test` passed (exit 0), `npm run lint` passed with 0 TypeScript errors (exit 0), `npx expo-doctor` passed 21/21, and `git diff --check` passed.
- Lockfile cleanup: `pnpm-lock.yaml` deleted. Canonical package manager is npm.
- Expo Doctor status: `npx expo-doctor` passed 21/21 (100%).
- Device runtime harness: pending physical device tests for long-track endurance, PMTiles local range reads, Storage download, and background capture.
- T4 checks: `npx --no-install tsx src/tests/activity_track_db.test.ts`, `activity_record_sqlite.test.ts`, `activity_autosave_slim.test.ts`, and `activity_store.test.ts` all passed; `git diff --check` passed. `npm run lint` is blocked by the pre-existing missing `invariant` declaration in `expo-modules-core` after dependency installation.
- T5 checks: `npm test` passed (including the dynamic local filename → stable `activity.gpx` metadata regression), `npx --no-install tsx src/tests/activity_gpx_storage.test.ts` and `activity_store.test.ts` passed, `npx expo-doctor` passed 21/21, and `git diff --check` passed. `npm run lint`/`tsc --noEmit` remain blocked only by the pre-existing missing `invariant` declaration in `expo-modules-core`. Firebase Storage/Firestore emulator and physical-device proof were not run.
- T6 checks: `npx --no-install tsx src/tests/route_publication_artifacts.test.ts`, `map_pack_formats.test.ts`, `offline_hu4.test.ts`, `activity_gpx_storage.test.ts`, and `npm test` passed; `git diff --check` passed. `npm run lint` remains blocked only by the pre-existing missing `invariant` declaration in `expo-modules-core`. Firestore rules emulator and Storage upload proof were not run. T6 defines metadata-only paired publication (same version, exact Storage paths, MIME/size/hash/status) and leaves binary generation/download to T7.
- T7 checks: `npx --no-install tsx src/tests/offline_bundle.test.ts`, `npx --no-install tsx src/tests/storage_rules_route_bundle.test.ts`, `npx --no-install tsx src/tests/offline_hu4.test.ts`, `npx --no-install tsx src/tests/offline_map_fallback.test.ts`, `npm test`, `git diff --check`, `npm run lint`, and `npx expo-doctor` passed. The v2 manifest is committed only after both stable binary files are finalized; generation-based replacement preserves the previous valid bundle if manifest/index persistence fails. Size/SHA/PMTiles magic validation, temp cleanup, rollback, route read/write rule contracts, and truthful GPX fallback state are covered by pure tests. Cold-offline native rendering remains a physical-device gate; this code keeps PMTiles enabled where supported and falls back after map error/3-second timeout without claiming vector basemap rendering. The PMTiles readiness regression (initial online `mapReady`, then offline-style failure) is covered by the focused fallback test; lifecycle readiness now means offline pack readiness and renderer errors clear it. Firebase Storage emulator and physical-device proof were not run.
- T8 checks: `npx --no-install tsx src/tests/background_location.test.ts`, `npm test`, `npm run lint`, `npx expo-doctor`, and `git diff --check` passed. `expo-task-manager@~57.0.19` is aligned with Expo SDK 57. The top-level task restores the live session before ordered batched points and delegates to the existing serialized SQLite-first store; permission denial and idempotent start/stop are covered by pure wiring tests. Native background execution, long-track endurance, terminated-app recovery, Expo Go Android behavior, and physical-device permission prompts remain unverified device gates; do not claim 100% HU-08.
- T9 cleanup: removed the dead raster/data-URI path (`tileCache.ts`, `offlineMaps.ts`, `tileRegistry.ts`, `PlanMap.tsx`, and 85 bundled PNG tiles), removed the obsolete 1500-tile acceptance assertions, and synchronized the verification matrix in `docs/USER_STORIES.md`, `docs/ARCHITECTURE.md`, `docs/plan/offline_maps.md`, and `docs/BACKLOG.md`. No active `tileCacheDB` GPX/PMTiles route bundle code was deleted. Firebase Emulator, Expo Go UI, physical Android/iOS cold-airplane PMTiles/Storage, background screen-off/terminated/endurance, native share sheet and full UI review remain pending; HU-04…HU-08 remain ≤90%.

## Next step
Next: run the pending Firebase Emulator, Expo Go UI, physical Android/iOS cold-airplane Storage/PMTiles, background screen-off/terminated/endurance, native share sheet and full UI review gates. Do not mark HU-04…HU-08 complete or 100% until those gates have evidence.
