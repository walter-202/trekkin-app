import assert from "node:assert/strict";
import { shouldFitBounds } from "../infrastructure/map/mapBridge";
import { buildTrekMapScene } from "../presentation/components/map/buildTrekMapScene";

const start = { lat: -16.5, lng: -68.1, name: "Inicio" };
const first = { lat: -16.5001, lng: -68.1 };
const second = { lat: -16.5002, lng: -68.1 };

const freeScene = buildTrekMapScene({
  track: [first, second],
  start,
  end: undefined,
  fitTo: [start],
  followUser: false,
});

assert.equal(freeScene.followUser, false);
assert.equal(
  freeScene.markers.some((marker) => marker.kind === "end"),
  false,
);
assert.equal(
  shouldFitBounds(freeScene.bounds, freeScene.followUser, false),
  true,
);
assert.equal(
  shouldFitBounds(freeScene.bounds, freeScene.followUser, true),
  false,
);

const guidedScene = buildTrekMapScene({
  trail: [first, second],
  fitTo: [first, second],
});

assert.equal(guidedScene.followUser, undefined);
assert.equal(
  shouldFitBounds(guidedScene.bounds, guidedScene.followUser, true),
  true,
);

console.log(
  "HU-08 map contract: full scene, free end marker and isolated camera policy passed",
);
