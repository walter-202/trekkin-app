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
- [x] HU3-3 — Generate/validate the bounded preview at publication and stop retaining full public waypoints; derive exact offline geometry from the downloaded GPX (focused publication, offline-bundle, and HU-04 tests pass; TypeScript lint and diff checks pass).
- [x] HU3-4 — Render the online detail from RoutePreview, preserve bounded legacy fallback, and protect offline download by authentication and paired-artifact validation (focused detail and publication tests pass).
- [x] HU3-5 — Add a bounded local route-detail cache keyed by route ID and preview version/hash with stale-while-revalidate behavior (focused cache test and TypeScript lint pass).
- [x] HU3-6 — Synchronize HU-03/HU-04 documentation and evidence matrix; record limitations and checks without claiming device proof.

## Acceptance criteria

1. Catalog requests use stable cursor pagination and do not need complete route geometry.
2. Publication creates a versioned, bounded preview (`polyline6`) and removes full `waypoints` from the public Firestore document.
3. `TrekMap` receives online preview geometry in memory and never receives `offlinePackPath` in HU-03.
4. Offline bundle creation derives its exact local trail from the downloaded GPX, not public Firestore geometry.
5. GPX + PMTiles download remains behind the authenticated action and requires a valid uploaded pair.
6. Local route-detail cache uses route ID and preview version/hash; network refresh replaces stale cache.
7. Existing tests, new focused tests, TypeScript lint, and diff checks pass.
8. HU-03 evidence remains honest about pending Firebase Emulator, Expo Go/device, and UI review gates.

## Progress

- Branch created: `codex/hu3-online-preview` from current `main`.
- Exploration completed: current detail already renders `route.waypoints` online; pagination/search/download gates are incomplete.
- HU3-1 complete: `RoutePreview` is optional for migration compatibility; polyline6, bounded simplification, deterministic cap, and bbox/hash validation are covered by `src/tests/route_preview_hu3.test.ts`.
- HU3-2 complete: Firestore catalog pages use stable `createdAt` + document-id ordering; `ExploreView` applies search over loaded pages and loads more on demand. Firebase Web Firestore cannot project individual document fields, so legacy waypoint payloads remain on the wire until data migration; the catalog mapper discards them.
- HU3-3 complete: route publication generates a bounded versioned preview, Firestore rules require that preview and reject public full waypoints, and the downloaded GPX provides exact offline manifest geometry after byte-size/hash validation.
- HU3-4 complete: public route detail renders decoded `RoutePreview`, bounds legacy fallback points, and does not fetch Storage artifacts or pass `offlinePackPath`; guest download/tracking is gated, while download additionally requires a valid uploaded GPX + PMTiles pair.
- HU3-5 complete: `GetRouteDetailWithCache` emits up to 30 locally cached public metadata details before server refresh; entries key by route ID plus preview version/geometry hash, and refreshed network data replaces stale cache.
- HU3-6 complete: `docs/USER_STORIES.md` and `docs/hu/HU-03-explorar.md` now distinguish online preview from offline GPX/PMTiles and retain HU-03 at 90% / HU-04 at 80% pending Emulator, Expo Go/device, web, and human UI-review proof.
- Verification passed: `offline_bundle.test.ts`, `offline_hu4.test.ts`, `route_publication_artifacts.test.ts`, `firestore_rules_published_preview.test.ts`, `route_preview_hu3.test.ts`, `route_detail_online_hu3.test.ts`, and `route_detail_cache_hu3.test.ts` via `npx --no-install tsx`; `npm run lint` (`tsc --noEmit`); `git diff --check`.
- Not run: Firebase Emulator/Storage integration, Expo Go/device matrix, web runtime map check, and human UI review.
- `RouteSchema` now explicitly preserves required top-level `createdAt` and `updatedAt`, fixing Zod's previous stripping of those `RouteModel` fields in cache validation.
- Delivery strategy chosen by user: `stacked-to-main`. No push, PR, or merge has occurred or is authorized.

## Next step

Next: create the local Conventional Commit for HU3-3 through HU3-6, record its commit identity here and in the Engram mirror, and leave remote delivery to the user.
