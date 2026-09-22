import assert from "node:assert/strict";
import {
  PublishRouteUseCase,
  ValidateRoutePublicationUseCase,
  routeArtifactStoragePath,
} from "../core/application/route/PublishRoute.usecase";
import { RoutePublicationArtifactsSchema } from "../core/domain/routeArtifacts.schemas";
import type { RouteModel, RoutePublicationArtifacts } from "../core/domain/types";

const routeId = "ruta-valle-luna";
const version = 3;

function artifactFixture(): RoutePublicationArtifacts {
  return {
    version,
    gpx: {
      kind: "gpx",
      version,
      storagePath: routeArtifactStoragePath(routeId, version, "gpx"),
      fileName: "route.gpx",
      mimeType: "application/gpx+xml",
      byteSize: 1_024,
      sha256: "a".repeat(64),
      status: "uploaded",
      updatedAt: 1_700_000_000_000,
    },
    pmtiles: {
      kind: "pmtiles",
      version,
      storagePath: routeArtifactStoragePath(routeId, version, "pmtiles"),
      fileName: "basemap.pmtiles",
      mimeType: "application/vnd.pmtiles",
      byteSize: 2_048,
      sha256: "b".repeat(64),
      status: "uploaded",
      updatedAt: 1_700_000_000_000,
    },
  };
}

const route = {
  id: routeId,
  title: "Valle de la Luna",
  description: "Ruta de prueba",
  region: "La Paz",
  startPoint: { name: "Inicio", lat: -16.5, lng: -68.1 },
  endPoint: { name: "Fin", lat: -16.51, lng: -68.11 },
  distanceKm: 4,
  durationMinutes: 120,
  difficulty: "facil",
  modality: "solo",
  status: "in_review",
  isPrivate: false,
  creatorId: "creator-1",
  creatorName: "Trekker",
  waypoints: [],
  checkpoints: [],
  photos: [],
  createdAt: 1,
  updatedAt: 1,
} satisfies RouteModel;

async function main() {
  assert.equal(
    routeArtifactStoragePath(routeId, version, "gpx"),
    "routes/ruta-valle-luna/v3/route.gpx",
  );
  assert.equal(
    routeArtifactStoragePath(routeId, version, "pmtiles"),
    "routes/ruta-valle-luna/v3/basemap.pmtiles",
  );
  assert.throws(() => routeArtifactStoragePath("ruta/no", 1, "gpx"));
  assert.throws(() => routeArtifactStoragePath(routeId, 0, "gpx"));

  const artifacts = artifactFixture();
  assert.deepEqual(RoutePublicationArtifactsSchema.parse(artifacts), artifacts);
  assert.deepEqual(ValidateRoutePublicationUseCase(routeId, artifacts), artifacts);

  assert.throws(() => RoutePublicationArtifactsSchema.parse({
    ...artifacts,
    version: 1.5,
  }), /int|integer|entero/i);
  assert.throws(() => RoutePublicationArtifactsSchema.parse({
    ...artifacts,
    version: 0,
  }), /positive|positivo|too small/i);
  assert.throws(() => RoutePublicationArtifactsSchema.parse({
    ...artifacts,
    gpx: { ...artifacts.gpx, sha256: "not-a-digest" },
  }), /sha256|digest|64/i);
  assert.deepEqual(
    RoutePublicationArtifactsSchema.parse({
      ...artifacts,
      gpx: { ...artifacts.gpx, sha256: undefined },
    }).gpx.sha256,
    undefined,
  );

  const mixedVersion = { ...artifacts, pmtiles: { ...artifacts.pmtiles, version: 2 } };
  assert.throws(
    () => ValidateRoutePublicationUseCase(routeId, mixedVersion),
    /misma versión/,
  );
  assert.throws(
    () => ValidateRoutePublicationUseCase(routeId, {
      ...artifacts,
      gpx: { ...artifacts.gpx, status: "pending" },
    }),
    /todavía no está cargado/,
  );
  assert.throws(
    () => ValidateRoutePublicationUseCase(routeId, {
      ...artifacts,
      pmtiles: { ...artifacts.pmtiles, storagePath: "routes/other/v3/basemap.pmtiles" },
    }),
    /Storage/,
  );

  const updates: unknown[] = [];
  const published = await PublishRouteUseCase(
    route,
    artifacts,
    { publish: async (_id, update) => { updates.push(update); } },
    42,
  );
  assert.equal(published.status, "published");
  assert.deepEqual(published.artifacts, artifacts);
  assert.equal(updates.length, 1);
  assert.deepEqual((updates[0] as { status: string }).status, "published");

  console.log(
    "Route publication artifacts: versioned paths, paired metadata, status and publication validation passed",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
