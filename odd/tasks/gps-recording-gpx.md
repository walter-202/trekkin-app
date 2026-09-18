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
- [ ] T1 — Deliver native GPX files and validate serialization/attachment contract.
- [ ] T2 — Preserve ordered GPS updates and finish locally without network waits.
- [ ] T3 — Verify planning-to-recording recovery and document remaining limits.

## Evidence
- Authorized `git pull --ff-only`: already up to date.
- Baseline pure tests: HU-06 31/31, HU-08 15/15, track formats 8/8 (Luna verifier).
- Baseline `npm run lint`: failed due to concurrent UI edits (missing theme `accentWarning` and missing `FinishActivityResult` import). Recheck after changes; do not fix unrelated work automatically.
- Baseline `npx --yes expo-doctor`: 20/21; duplicate npm/pnpm lockfiles. Do not delete either without agreeing the package-manager migration.
- Device runtime harness: pending Android/iOS actual share sheet, offline finish/reopen and GPS walk. No physical-device evidence yet.
- Rollback: revert only this feature's explicit commits/files; preserve all pre-existing UI changes.

## Next step
Write isolated regression tests, implement T1/T2, run local suites and fresh Luna verification. Record commit IDs only after commits exist. Human/device approval remains necessary; no completion percentage is asserted.
