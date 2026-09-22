import assert from "node:assert/strict";
import type { RouteModel, RoutePublicationArtifacts } from "../core/domain/types";
import { routeArtifactStoragePath } from "../core/application/route/PublishRoute.usecase";
import { DownloadRouteOfflineUseCase, type DownloadedOfflineArtifact } from "../core/application/offline/DownloadRouteOffline.usecase";
import { OfflineRouteSchema } from "../core/domain/offline.schemas";

const route = (): RouteModel => ({
  id: "offline-bundle", title: "Bundle", description: "Published route", region: "La Paz",
  startPoint: { name: "Start", lat: -16.5, lng: -68.1 }, endPoint: { name: "End", lat: -16.51, lng: -68.11 },
  distanceKm: 2, durationMinutes: 60, difficulty: "facil", modality: "solo", status: "published", isPrivate: false,
  creatorId: "creator", creatorName: "Guide", waypoints: [{ lat: -16.5, lng: -68.1 }, { lat: -16.51, lng: -68.11 }],
  checkpoints: [], photos: [], createdAt: 1, updatedAt: 1,
  artifacts: { version: 1,
    gpx: { kind: "gpx", version: 1, storagePath: routeArtifactStoragePath("offline-bundle", 1, "gpx"), fileName: "route.gpx", mimeType: "application/gpx+xml", byteSize: 10, sha256: "a".repeat(64), status: "uploaded", updatedAt: 1 },
    pmtiles: { kind: "pmtiles", version: 1, storagePath: routeArtifactStoragePath("offline-bundle", 1, "pmtiles"), fileName: "basemap.pmtiles", mimeType: "application/vnd.pmtiles", byteSize: 8, sha256: "b".repeat(64), status: "uploaded", updatedAt: 1 },
  },
});
const file = (kind: "gpx" | "pmtiles", overrides: Partial<DownloadedOfflineArtifact> = {}): DownloadedOfflineArtifact => ({
  tempPath: `${kind}.part`, finalPath: `${kind}.final`, byteSize: kind === "gpx" ? 10 : 8,
  sha256: kind === "gpx" ? "a".repeat(64) : "b".repeat(64), headerBytes: kind === "pmtiles" ? "PMTiles\u0003" : "<gpx", ...overrides,
});
const ports = (download: (kind: "gpx" | "pmtiles") => Promise<DownloadedOfflineArtifact>) => {
  const cleaned: string[] = []; let finalized = false;
  return { cleaned, get finalized() { return finalized; },
    downloadArtifact: async (_id: string, kind: "gpx" | "pmtiles") => download(kind),
    cleanupArtifact: async (path: string) => { cleaned.push(path); },
    finalize: async () => { finalized = true; },
  };
};

async function main() {
  await assert.rejects(() => DownloadRouteOfflineUseCase({ ...route(), artifacts: undefined }, ports(async (kind) => file(kind))), /no tiene artefactos/i);
  await assert.rejects(() => DownloadRouteOfflineUseCase({ ...route(), artifacts: { ...route().artifacts!, gpx: { ...route().artifacts!.gpx, kind: "pmtiles" } } }, ports(async (kind) => file(kind))), /incompatible|MIME|tipo/i);
  await assert.rejects(() => DownloadRouteOfflineUseCase({ ...route(), artifacts: { ...route().artifacts!, pmtiles: { ...route().artifacts!.pmtiles, version: 2 } } }, ports(async (kind) => file(kind))), /misma versión/i);
  await assert.rejects(() => DownloadRouteOfflineUseCase({ ...route(), artifacts: { ...route().artifacts!, gpx: { ...route().artifacts!.gpx, storagePath: "routes/other/v1/route.gpx" } } }, ports(async (kind) => file(kind))), /Storage/i);
  await assert.rejects(() => DownloadRouteOfflineUseCase(route(), ports(async (kind) => file(kind, { byteSize: 7 }))), /tamaño/i);
  await assert.rejects(() => DownloadRouteOfflineUseCase(route(), ports(async (kind) => file(kind, { sha256: "c".repeat(64) }))), /SHA-256/i);
  await assert.rejects(() => DownloadRouteOfflineUseCase(route(), ports(async (kind) => kind === "pmtiles" ? file(kind) : Promise.reject(new Error("network")))), /network/);
  const cleanupCase = ports(async (kind) => kind === "pmtiles" ? file(kind) : Promise.reject(new Error("network")));
  await assert.rejects(() => DownloadRouteOfflineUseCase(route(), cleanupCase));
  assert.deepEqual(cleanupCase.cleaned, ["pmtiles.part"]);
  const success = ports(async (kind) => file(kind));
  const record = await DownloadRouteOfflineUseCase(route(), success, { downloadedAt: 42 });
  assert.equal(success.finalized, true);
  assert.equal(record.manifestVersion, 2);
  assert.equal(record.pmtilesPath, "pmtiles.final");
  assert.equal(OfflineRouteSchema.safeParse(record).success, true);
  console.log("Offline bundle: metadata/path/version, size/hash, cleanup and atomic manifest invariants passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
