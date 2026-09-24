import assert from "node:assert/strict";
import {
  MAX_ROUTE_PREVIEW_POINT_COUNT,
  buildRoutePreview,
  decodePolyline6,
  encodePolyline6,
} from "../core/domain/routePreview";
import { RoutePreviewSchema } from "../core/domain/routePreview.schemas";
import type { Coordinates } from "../core/domain/types";

const source: Coordinates[] = Array.from({ length: 15 }, (_, index) => ({
  lat: -16.5 + index * 0.001,
  lng: -68.15 + Math.sin(index / 2) * 0.002,
  altitude: 3_600 + index,
}));

function assertCoordinateEquals(actual: Coordinates, expected: Coordinates): void {
  assert.ok(Math.abs(actual.lat - expected.lat) < 0.000001);
  assert.ok(Math.abs(actual.lng - expected.lng) < 0.000001);
}

const encoded = encodePolyline6(source);
const decoded = decodePolyline6(encoded);
assert.equal(decoded.length, source.length);
decoded.forEach((point, index) => assertCoordinateEquals(point, source[index]));

const preview = buildRoutePreview(source, 5);
assert.equal(preview.version, 1);
assert.equal(preview.encoding, "polyline6");
assert.ok(preview.pointCount >= 2);
assert.ok(preview.pointCount <= 5);

const previewPoints = decodePolyline6(preview.polyline);
assert.equal(previewPoints.length, preview.pointCount);
assertCoordinateEquals(previewPoints[0], source[0]);
assertCoordinateEquals(previewPoints.at(-1)!, source.at(-1)!);
assert.ok(preview.bbox.minLat <= Math.min(...previewPoints.map((point) => point.lat)));
assert.ok(preview.bbox.maxLat >= Math.max(...previewPoints.map((point) => point.lat)));
assert.ok(preview.bbox.minLng <= Math.min(...previewPoints.map((point) => point.lng)));
assert.ok(preview.bbox.maxLng >= Math.max(...previewPoints.map((point) => point.lng)));
assert.deepEqual(RoutePreviewSchema.parse(preview), preview);

const oversized = Array.from(
  { length: MAX_ROUTE_PREVIEW_POINT_COUNT + 1 },
  (_, index): Coordinates => ({ lat: -16.5 + index / 1_000_000, lng: -68.15 }),
);
assert.throws(() => decodePolyline6(encodePolyline6(oversized)));
assert.throws(() => buildRoutePreview(source, 1));
assert.equal(
  RoutePreviewSchema.safeParse({
    ...preview,
    pointCount: MAX_ROUTE_PREVIEW_POINT_COUNT + 1,
  }).success,
  false,
);
assert.equal(
  RoutePreviewSchema.safeParse({ ...preview, pointCount: preview.pointCount + 1 }).success,
  false,
);
assert.equal(
  RoutePreviewSchema.safeParse({
    ...preview,
    bbox: { ...preview.bbox, minLng: preview.bbox.minLng - 0.000001 },
  }).success,
  false,
);

console.log("HU-03 route preview contract: bounded polyline6, bbox and validation passed");
