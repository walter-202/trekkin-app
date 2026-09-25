import assert from "node:assert/strict";
import {
  buildProtomapsExtractCommand,
  formatProtomapsBbox,
  routeBasemapBounds,
} from "../core/domain/protomaps";
import { ResolvePmtilesDownloadUrlUseCase } from "../core/application/offline/ResolvePmtilesDownloadUrl.usecase";
import type { RouteModel, RouteArtifactMetadata } from "../core/domain/types";

const route: RouteModel = {
  id: "ruta-demo",
  title: "Demo",
  description: "",
  region: "La Paz",
  startPoint: { name: "A", lat: -16.5, lng: -68.1 },
  endPoint: { name: "B", lat: -16.51, lng: -68.11 },
  distanceKm: 2,
  durationMinutes: 60,
  difficulty: "facil",
  modality: "solo",
  status: "published",
  isPrivate: false,
  creatorId: "u1",
  creatorName: "Guía",
  waypoints: [
    { lat: -16.5, lng: -68.1 },
    { lat: -16.505, lng: -68.105 },
    { lat: -16.51, lng: -68.11 },
  ],
  checkpoints: [],
  photos: [],
  createdAt: 1,
  updatedAt: 1,
};

const bounds = routeBasemapBounds(route);
assert.match(formatProtomapsBbox(bounds), /^-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+$/);

const cmd = buildProtomapsExtractCommand(route, "out.pmtiles");
assert.match(cmd, /^pmtiles extract https:\/\/build\.protomaps\.com\//);
assert.ok(cmd.includes("--bbox="));
assert.ok(cmd.includes("--maxzoom=16"));

const pmtilesMeta: RouteArtifactMetadata = {
  kind: "pmtiles",
  version: 1,
  storagePath: "routes/ruta-demo/v1/basemap.pmtiles",
  fileName: "basemap.pmtiles",
  mimeType: "application/vnd.pmtiles",
  byteSize: 5_000_000,
  status: "uploaded",
  updatedAt: 1,
  downloadUrl: "https://cdn.example.com/ruta-demo/basemap.pmtiles",
};

assert.equal(
  ResolvePmtilesDownloadUrlUseCase("ruta-demo", pmtilesMeta, {}),
  "https://cdn.example.com/ruta-demo/basemap.pmtiles",
);

assert.equal(
  ResolvePmtilesDownloadUrlUseCase(
    "ruta-demo",
    { ...pmtilesMeta, downloadUrl: undefined },
    { cdnBase: "https://cdn.example.com/packs" },
  ),
  "https://cdn.example.com/packs/ruta-demo/basemap.pmtiles",
);

console.log("Protomaps: bbox, extract command and download URL resolution passed");
