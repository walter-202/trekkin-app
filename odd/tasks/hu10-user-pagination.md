# HU-10 User List Cursor Pagination

## Objective

Complete HU-10's documented gap by allowing administrators to browse and filter all users in a collection larger than the current 50-user limit, using cursor-based Firestore pagination rather than loading the entire collection.

## Problem and Why

`UserManagementView` currently gets one Firestore page and applies search/status/role filtering in memory, so users beyond the first 50 are unreachable. This feature must keep Firestore reads bounded while preserving the existing filters, stable ordering, and truthful loading/error behavior.

## Scope and Constraints

- Authorized scope: HU-10 user-list pagination only.
- Preserve current text, status, and role filter semantics and the existing user-management authorization/actions.
- Keep cursor tokens opaque above the Firestore adapter; do not add Firebase imports to `core`.
- Advance the raw Firestore cursor even when a fetched page has no matches; reset cursor/results when filters change; guard concurrent loads and prevent duplicate UIDs on retry/overlap.
- Keep HU-10 status truthful: automated local checks are not Expo Go/device evidence; do not claim 100% without the required full device matrix, UI review, and user approval.
- No dependency/config changes, remote operations, push, or PR.

## Effective TDD and Verification

- Mode: Standard functional verification (explicitly confirmed by the user on 2026-09-23); strict RED → GREEN → REFACTOR is not enabled.
- Exact focused test runner: `npx tsx src/tests/user_management_hu10.test.ts`.
- Required local checks: `npm run lint`, focused HU-10 test, and `npm test`.
- Runtime scenario: In Expo Go, authenticate as admin, open User Management, page through a dataset larger than 50, exercise each filter/search across page boundaries, and confirm reset, loading, error/retry, and end-of-list behavior. Pending until run on device.

## Delivery

- Branch: `codex/hu10-user-pagination`.
- Strategy: `ask-on-risk` (default); the staged work unit currently contains 471 authored changed lines including this tracker. The user previously selected `stacked-to-main` for any future PR sequence. No remote operation or PR is authorized; this is one coherent local behavior, so keep it as one work unit and treat 400 lines as a planning heuristic rather than forcing a nonfunctional split.
- Work-unit commit: `526f6ed` — `feat(admin): paginate user management list`; one coherent pagination behavior including application/data contract, UI, tests, and HU evidence. No attribution trailer.
- Runtime receipt-driven development: off by default at the time of planning; no review transaction will be started.

## Acceptance Criteria

- [x] Firestore can return subsequent bounded user pages through an opaque cursor with deterministic traversal and a correct `hasMore` signal.
- [x] The admin list makes all pages reachable and preserves text/status/role filtering across loaded pages, including when an intermediate raw page has no matches.
- [x] Search/filter changes discard stale rows and start from the first page; repeated/concurrent page events do not duplicate users or corrupt pagination state.
- [x] Loading, failure/retry, empty-results-with-more-data, and end-of-list states are explicit and accessible.
- [x] HU-10 evidence in `docs/USER_STORIES.md` matches the implemented behavior and honestly marks device proof as pending.
- [x] Focused HU-10 suite (27/27), `npm run lint`, and `git diff --check` pass.
- [ ] The full `npm test` suite remains pending as authorized evidence: a delegated run exited 0 but reported contacting the configured live Firestore service without explicit authorization. Do not rerun it until the user explicitly authorizes the target and credential/session. Expo Go/device validation also remains pending.

## Tasks

### HU10-1 — Implement cursor-paged user browsing end to end

- [x] Define an application-level paged result/cursor contract and implement bounded, deterministically ordered Firestore reads without introducing Firebase into `core`.
- [x] Integrate incremental loading and filter/search resets into the existing admin user list; preserve filter behavior over loaded pages, including raw pages with zero matches.
- [x] Add regression coverage for multi-page traversal, terminal pages, empty filtered pages, resets, duplicate/concurrent loads, and retry/error transitions as supported by current test seams.
- [x] Update HU-10 implementation/evidence notes in `docs/USER_STORIES.md`; do not overstate Expo Go verification.
- [x] Run final local HU-10 focused suite, lint, and diff check; report remaining device/full-suite limitations honestly.
- [ ] Obtain explicit authorization for the full suite's live Firestore target and credential/session, then run `npm test` (or record a user-run result).
- [ ] Complete the Expo Go admin pagination scenario and required human UI/diff review.
- [x] Commit the local work unit, record its identity here, and synchronize the final tracker with Engram.

## Progress and Evidence

- State: Implemented and committed locally; source-level independent verification and focused checks pass. Explicitly authorized full suite and Expo Go/device review remain pending.
- Exploration evidence: HU-10 criteria at `docs/USER_STORIES.md:239-256`; current one-shot service, array-only use-case port, and client-side filters were confirmed before implementation.
- Verification: `npx tsx src/tests/user_management_hu10.test.ts` — 27/27 pass (also rerun by parent); `npm run lint` — pass; `git diff --check` — pass. `npm test` — one delegated run exited 0 but reported live Firestore access; this was not authorized and is not accepted as final proof. No Expo Go run.
- Independent review: No remaining source-level findings. Tests use mocked page ports; no Firestore adapter emulator/live test or mounted-view test exists yet.
- Commit: `526f6ed` — `feat(admin): paginate user management list`.

## Next Step

Obtain explicit authorization for the configured live Firestore target and credential/session before rerunning `npm test`, and complete the Expo Go admin pagination scenario plus human UI/diff review. No remote operations or PR are authorized.
