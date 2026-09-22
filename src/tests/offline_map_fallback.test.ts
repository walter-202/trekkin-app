import assert from "node:assert/strict";
import { shouldUseOfflineTrailFallback } from "../core/domain/offlineMapFallback";

assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: false, mapReady: false, mapError: true, timedOut: true }), false);
assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: true, mapError: true, timedOut: true }), false);
assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: false, mapError: true, timedOut: false }), true);
assert.equal(shouldUseOfflineTrailFallback({ hasLocalPack: true, mapReady: false, mapError: false, timedOut: true }), true);
console.log("Offline map fallback: only local-pack renderer failures/timeouts use truthful GPX trail fallback");
