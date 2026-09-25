import assert from "node:assert/strict";
import {
  CheckRouteDownloadAvailabilityUseCase,
  GetRoutePreviewPointsUseCase,
} from "../core/application/explore/RouteDetailSupport.usecase";
import { routeArtifactStoragePath } from "../core/application/route/PublishRoute.usecase";
import { buildRoutePreview, decodePolyline6 } from "../core/domain/routePreview";
import type { RouteModel, RoutePublicationArtifacts } from "../core/domain/types";

const points = [
  { lat: -16.5, lng: -68.1 },
  { lat: -16.505, lng: -68.105 },
  { lat: -16.51, lng: -68.11 },
];

function artifacts(): RoutePublicationArtifacts {
  const version = 1;
  return {
    version,
    gpx: {
      kind: "gpx", version, storagePath: routeArtifactStoragePath("detail-route", version, "gpx"),
      fileName: "route.gpx", mimeType: "application/gpx+xml", byteSize: 128,
      sha256: "a".repeat(64), status: "uploaded", updatedAt: 1,
    },
    pmtiles: {
      kind: "pmtiles", version, storagePath: routeArtifactStoragePath("detail-route", version, "pmtiles"),
      fileName: "basemap.pmtiles", mimeType: "application/vnd.pmtiles", byteSize: 5 * 1024 * 1024,
      sha256: "b".repeat(64), status: "uploaded", updatedAt: 1,
    },
  };
}

const route: RouteModel = {
  id: "detail-route", title: "Detalle", description: "Ruta de prueba", region: "La Paz",
  startPoint: { name: "Inicio", lat: points[0].lat, lng: points[0].lng },
  endPoint: { name: "Fin", lat: points[2].lat, lng: points[2].lng },
  distanceKm: 2, durationMinutes: 60, difficulty: "facil", modality: "solo",
  status: "published", isPrivate: false, creatorId: "guide", creatorName: "Guía",
  waypoints: points, checkpoints: [], photos: [], createdAt: 1, updatedAt: 1,
};

const preview = buildRoutePreview(points);
assert.deepEqual(
  GetRoutePreviewPointsUseCase({ ...route, preview, waypoints: [points[0], points[2]] }),
  decodePolyline6(preview.polyline),
  "online detail prefers the compact published preview over legacy Firestore geometry",
);
const legacyTrail = GetRoutePreviewPointsUseCase(route);
assert.deepEqual(legacyTrail[0], points[0], "legacy fallback retains the starting point");
assert.deepEqual(legacyTrail.at(-1), points.at(-1), "legacy fallback retains the ending point");

const longLegacyRoute = {
  ...route,
  waypoints: Array.from({ length: 500 }, (_, index) => ({
    lat: -16.5 + index * 0.00001,
    lng: -68.1 + index * 0.00001,
  })),
};
assert.ok(GetRoutePreviewPointsUseCase(longLegacyRoute).length <= 200, "legacy geometry is bounded before MapLibre render");

const publishedRoute = { ...route, artifacts: artifacts() };
assert.deepEqual(CheckRouteDownloadAvailabilityUseCase(publishedRoute, true), { available: true });
assert.deepEqual(CheckRouteDownloadAvailabilityUseCase(publishedRoute, false), {
  available: false, reason: "authentication_required",
});
assert.deepEqual(CheckRouteDownloadAvailabilityUseCase({ ...publishedRoute, artifacts: undefined }, true), {
  available: false, reason: "artifacts_unavailable",
});
assert.deepEqual(CheckRouteDownloadAvailabilityUseCase({ ...publishedRoute, status: "in_review" }, true), {
  available: false, reason: "route_not_published",
});
assert.deepEqual(CheckRouteDownloadAvailabilityUseCase({
  ...publishedRoute,
  artifacts: { ...artifacts(), pmtiles: { ...artifacts().pmtiles, version: 2 } },
}, true), { available: false, reason: "artifacts_unavailable" });

console.log("HU-03 route detail: compact preview, bounded legacy fallback and authenticated paired download gate passed");
