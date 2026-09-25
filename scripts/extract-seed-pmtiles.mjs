#!/usr/bin/env node
/**
 * Extrae PMTiles (Protomaps) para todas las rutas del seed y regenera el registry de Metro.
 *
 * Requisito: `pmtiles` en PATH → https://github.com/protomaps/go-pmtiles/releases
 *
 * Uso:
 *   pnpm pmtiles:extract:seed
 *   pnpm pmtiles:extract:seed --dry-run
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = join(ROOT, "assets", "offline-pmtiles");
const GENERATED = join(
  ROOT,
  "src",
  "infrastructure",
  "map",
  "bundledPmtiles.generated.ts",
);
const PLANET_URL =
  process.env.PROTOMAPS_PLANET_URL?.trim() ||
  "https://build.protomaps.com/20251229.pmtiles";
const MAX_ZOOM = process.env.PROTOMAPS_MAX_ZOOM ?? "16";

const ROUTES = JSON.parse(
  readFileSync(join(ROOT, "scripts", "seed-routes-bundles.json"), "utf8"),
);

function bboxFromRoute(route) {
  const pts = route.waypoints?.length >= 2
    ? route.waypoints
    : [route.startPoint, route.endPoint];
  let minLat = pts[0].lat;
  let maxLat = pts[0].lat;
  let minLng = pts[0].lng;
  let maxLng = pts[0].lng;
  for (const p of pts.slice(1)) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const pad = 0.2;
  const latD = Math.max(maxLat - minLat, 0.005);
  const lngD = Math.max(maxLng - minLng, 0.005);
  return `${minLng - lngD * pad},${minLat - latD * pad},${maxLng + lngD * pad},${maxLat + latD * pad}`;
}

function writeGeneratedRegistry(routeIds) {
  const lines = routeIds.map(
    (id) =>
      `  "${id}": require("../../../assets/offline-pmtiles/${id}/basemap.pmtiles"),`,
  );
  const body = `/**
 * Generado por \`pnpm pmtiles:extract:seed\` cuando existen .pmtiles en assets/.
 * No editar a mano salvo que no uses el script.
 */
export const BUNDLED_PMTILES_MODULES: Record<string, number> = {
${lines.join("\n")}
};
`;
  writeFileSync(GENERATED, body, "utf8");
}

const dryRun = process.argv.includes("--dry-run");
const extracted = [];

console.log("# Protomaps — extract seed routes → assets/offline-pmtiles/\n");

for (const route of ROUTES) {
  const outDir = join(ASSETS_DIR, route.id);
  const out = join(outDir, "basemap.pmtiles");
  mkdirSync(outDir, { recursive: true });
  const bbox = bboxFromRoute(route);
  const args = [
    "extract",
    PLANET_URL,
    out,
    `--bbox=${bbox}`,
    "--minzoom=0",
    `--maxzoom=${MAX_ZOOM}`,
  ];
  console.log(`→ ${route.id}`);
  console.log(`  pmtiles ${args.join(" ")}\n`);
  if (dryRun) continue;

  const result = spawnSync("pmtiles", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\nFalló ${route.id}. Instala pmtiles CLI primero.`);
    process.exit(result.status ?? 1);
  }
  const bytes = statSync(out).size;
  console.log(`  ✓ ${(bytes / (1024 * 1024)).toFixed(2)} MB\n`);
  extracted.push(route.id);
}

if (!dryRun && extracted.length > 0) {
  writeGeneratedRegistry(extracted);
  console.log(`Registry actualizado: ${GENERATED}`);
  console.log(`Rutas empaquetadas: ${extracted.join(", ")}`);
  console.log("\nReinicia Metro (pnpm start) y prueba Descargar / Preparar ruta.");
} else if (dryRun) {
  console.log("Dry-run: no se escribieron archivos.");
}
