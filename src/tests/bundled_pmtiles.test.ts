import assert from "node:assert/strict";
import {
  SEED_ROUTE_IDS,
  isSeedRouteId,
} from "../core/domain/seedRoutes";
import { BUNDLED_PMTILES_MODULES } from "../infrastructure/map/bundledPmtiles.generated";

assert.equal(SEED_ROUTE_IDS.length, 5);
assert.ok(isSeedRouteId("route-takesi"));
assert.equal(isSeedRouteId("ruta-inventada"), false);

// Sin `pnpm pmtiles:extract:seed` el registry está vacío en CI.
assert.equal(Object.keys(BUNDLED_PMTILES_MODULES).length, 0);

console.log("Bundled PMTiles: seed route ids and optional module registry passed");
