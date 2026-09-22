# HU-03 online route preview and catalog efficiency

## Objective and authorization

Implement the authorized separation between the HU-03 connected catalog/detail flow and the HU-04 offline download flow. The online detail must render a compact route preview through MapLibre/OpenFreeMap without downloading GPX or PMTiles; the offline button remains the only entry point for Firebase Storage GPX + PMTiles downloads.

## Constraints

- Firestore published route documents contain metadata, a bounded preview, checkpoints, and artifact references only; no GPS chunks and no unbounded public waypoint arrays.
- Full GPX and PMTiles remain Firebase Storage artifacts and are fetched only for download or route execution when no local copy exists.
- No raster PNG tile cache or new map engine.
- Preserve Clean Architecture and TypeScript strictness.
- Keep current branch delivery local; no push, PR, or merge.
- Delivery strategy: `ask-on-risk`; user-selected chain strategy: `stacked-to-main` (each eventual PR targets `main`, sequenced after the preceding merge). This records intended PR structure only; no remote delivery is authorized.
- TDD mode is not explicitly configured; use ordinary regression tests with `npx --no-install tsx` and `npm run lint`.

## Tasks

- [x] HU3-1 — Add the published route preview domain contract, validation, bounded simplification/encoding helpers, and focused tests (commit 015dee9; focused preview test, lint, and diff checks pass).
- [x] HU3-2 — Make the published catalog paginated and ordered, apply search results correctly, and validate preview data at the Firestore boundary (commit ef49a94; focused catalog test, lint, and diff checks pass).
- [ ] HU3-3 — Wire the route detail to the online preview contract and protect the offline download action for authenticated users/artifact availability; add UI/use-case regression tests.
- [ ] HU3-4 — Synchronize HU-03 documentation and evidence matrix; record limitations and checks without claiming device proof.

## Acceptance criteria

1. Catalog requests use stable cursor pagination and do not need complete route geometry.
2. Published detail carries a versioned, bounded preview (`polyline6` or equivalent) with point count and bounding box.
3. `TrekMap` receives online preview geometry in memory and never receives `offlinePackPath` in HU-03.
4. GPX + PMTiles download remains behind the authenticated action and existing atomic offline bundle use case.
5. Existing tests, new focused tests, TypeScript lint, and diff checks pass.
6. HU-03 evidence remains honest about pending Firebase Emulator, Expo Go/device, and UI review gates.

## Progress

- Branch created: `codex/hu3-online-preview` from current `main`.
- Exploration completed: current detail already renders `route.waypoints` online; pagination/search/download gates are incomplete.
- HU3-1 complete: `RoutePreview` is optional for migration compatibility; polyline6, bounded simplification, deterministic cap, and bbox/hash validation are covered by `src/tests/route_preview_hu3.test.ts`.
- HU3-2 complete: Firestore catalog pages use stable `createdAt` + document-id ordering; `ExploreView` applies search over loaded pages and loads more on demand. Firebase Web Firestore cannot project individual document fields, so legacy waypoint payloads remain on the wire until data migration; the catalog mapper discards them.
- Delivery strategy chosen by user: `stacked-to-main`. No push, PR, or merge has occurred or is authorized.

## Next step

Next: implement HU3-3 (online preview on detail, authentication/artifact gates for offline download, regression tests).
