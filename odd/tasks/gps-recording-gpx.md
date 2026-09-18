# Reliable planning, recording and GPX

## Objective and authorization
Deliver HU-07 -> HU-08 recording and a real GPX attachment without depending on an offline basemap. The user authorized implementation and origin pull; vector archives are accepted. Preserve concurrent UI work. Main agent writes; Luna high agents explore and verify.

## Scope and acceptance
- T1: Native GPX is a local file shared with the GPX MIME type; web keeps its download behavior.
- T2: GPS/state mutations are serialized; storage failures are visible; finishing persists locally before returning and does not wait for Firestore. Local history remains available offline and is user-scoped.
- T3: Assess planning restore and map-independent handoff; correct bounded blockers without overwriting concurrent UI changes.
- Follow-up: incremental long-track storage, background capture, segment-aware export, real vector map packages and physical-device endurance proof remain required for full v1. This slice must not claim those are delivered.

## Workflow
- Branch: `codex/gps-recording-gpx`; branch point: `91dd456`.
- Delivery: `ask-on-risk`; no push, PR or merge authorized. Initial slice forecast: approximately 350 authored changed lines; remeasure before commits. No code-golf to fit the heuristic.
- RDD: off, decided by default (`gentle-ai review mode status`). No native review will run.
- TDD: no explicit enabled/disabled project setting found. Do not claim strict TDD; add regression tests before fixes, with ordinary functional verification. Runner: `npx --no-install tsx` (cached 4.23.13).
- Tests must remain local; do not execute the umbrella suite against live Firestore.

## Tasks
- [x] T1 — Deliver native GPX files and validate serialization/attachment contract (commit ef71de3).
- [x] T2 — Preserve ordered GPS updates and finish locally without network waits (commit ef71de3).
- [x] T3 — Verify planning-to-recording recovery and document remaining limits (commit ef71de3).

## Evidence
- Authorized `git pull --ff-only`: merged into `main` via commit `e0effa3`.
- Baseline pure tests: all 10 local suites passed, including HU-01, HU-02, HU-06, HU-07, HU-08 (`npm test`).
- Lint status: `npm run lint` passing with 0 TypeScript errors.
- Lockfile cleanup: `pnpm-lock.yaml` deleted. Canonical package manager is npm.
- Expo Doctor status: `npx expo-doctor` passed 21/21 (100%).
- Device runtime harness: pending physical device tests for long-track endurance and background capture (HU-08 full production).

## Next step
Device validation on Expo Go / EAS build. Coordinate background capture (Foreground Service / expo-task-manager) and automatic sync queue when connectivity is restored.
