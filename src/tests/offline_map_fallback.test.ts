import assert from "node:assert/strict";
import { shouldUseOfflineTrailFallback } from "../core/domain/offlineMapFallback";

assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: false, mapReady: false, mapError: true, timedOut: true }), false);
assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: true, mapError: true, timedOut: true }), false);
assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: false, mapError: true, timedOut: false }), true);
assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: false, mapError: false, timedOut: true }), true);
// The initial online style can report ready before the PMTiles style is attempted.
// The later offline failure must still fall back because readiness tracks PMTiles,
// not the first MapLibre load event.
let offlinePackReady = false;
assert.equal(
  shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: offlinePackReady, mapError: true, timedOut: true }),
  true,
);
offlinePackReady = true;
assert.equal(
  shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: offlinePackReady, mapError: true, timedOut: true }),
  false,
);
// An error after a prior offline-ready event clears readiness in the view.
offlinePackReady = false;
assert.equal(
  shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: offlinePackReady, mapError: true, timedOut: false }),
  true,
);
console.log("Offline map fallback: only local-pack renderer failures/timeouts use truthful GPX trail fallback");
