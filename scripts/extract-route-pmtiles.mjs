#!/usr/bin/env node
/**
 * Genera basemap.pmtiles para una ruta con Protomaps CLI (sin Firebase Storage).
 *
 * Requisitos: `pmtiles` en PATH → https://github.com/protomaps/go-pmtiles/releases
 *
 * Uso:
 *   node scripts/extract-route-pmtiles.mjs --route-id ruta-huayna-potosi \
 *     --bbox=-68.5,-17.0,-67.5,-15.8 --out dist/pmtiles/ruta-huayna-potosi/basemap.pmtiles
 *
 *   node scripts/extract-route-pmtiles.mjs --route-json ./mi-ruta.json --out ./basemap.pmtiles
 *
 * Tras generar, sube el .pmtiles a tu CDN y en Firestore:
 *   artifacts.pmtiles.downloadUrl = "https://tu-cdn.com/ruta-id/basemap.pmtiles"
 *   artifacts.pmtiles.byteSize = <tamaño real del archivo>
 *
 * O define EXPO_PUBLIC_PMTILES_CDN_BASE en .env y sube a {cdn}/{routeId}/basemap.pmtiles
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLANET_URL =
  process.env.PROTOMAPS_PLANET_URL?.trim() ||
  "https://build.protomaps.com/20251229.pmtiles";
const MAX_ZOOM = Number(process.env.PROTOMAPS_MAX_ZOOM ?? "16");
const MIN_ZOOM = Number(process.env.PROTOMAPS_MIN_ZOOM ?? "0");

function parseArgs(argv) {
  const args = {
    routeId: null,
    routeJson: null,
    bbox: null,
    out: null,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    else if (token.startsWith("--route-id=")) args.routeId = token.slice(11);
    else if (token === "--route-id") args.routeId = argv[++i];
    else if (token.startsWith("--route-json=")) args.routeJson = token.slice(13);
    else if (token === "--route-json") args.routeJson = argv[++i];
    else if (token.startsWith("--bbox=")) args.bbox = token.slice(7);
    else if (token === "--bbox") args.bbox = argv[++i];
    else if (token.startsWith("--out=")) args.out = token.slice(6);
    else if (token === "--out") args.out = argv[++i];
    else throw new Error(`Argumento desconocido: ${token}`);
  }
  return args;
}

function bboxFromRoute(route) {
  const pts = [];
  if (Array.isArray(route.waypoints) && route.waypoints.length >= 2) {
    pts.push(...route.waypoints);
  } else {
    pts.push(route.startPoint, route.endPoint);
  }
  if (Array.isArray(route.checkpoints)) {
    for (const cp of route.checkpoints) pts.push(cp);
  }
  if (pts.length === 0) throw new Error("La ruta no tiene puntos para calcular bbox.");

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

function main() {
  const args = parseArgs(process.argv);
  let routeId = args.routeId;
  let bbox = args.bbox;

  if (args.routeJson) {
    const route = JSON.parse(readFileSync(resolve(args.routeJson), "utf8"));
    routeId = routeId ?? route.id;
    if (!bbox) bbox = bboxFromRoute(route);
  }

  if (!bbox) {
    console.error("Indica --bbox=west,south,east,north o --route-json con waypoints.");
    process.exit(1);
  }
  if (!routeId) {
    console.error("Indica --route-id para nombrar la salida y la URL del CDN.");
    process.exit(1);
  }

  const out =
    args.out ??
    resolve(dirname(fileURLToPath(import.meta.url)), `../dist/pmtiles/${routeId}/basemap.pmtiles`);
  mkdirSync(dirname(out), { recursive: true });

  const cmd = "pmtiles";
  const cmdArgs = [
    "extract",
    PLANET_URL,
    out,
    `--bbox=${bbox}`,
    `--minzoom=${MIN_ZOOM}`,
    `--maxzoom=${MAX_ZOOM}`,
  ];

  console.log("# Protomaps extract (HU-04 sin Firebase Storage)");
  console.log(`${cmd} ${cmdArgs.join(" ")}`);
  if (args.dryRun) return;

  const result = spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error("\nInstala pmtiles: https://github.com/protomaps/go-pmtiles/releases");
    process.exit(result.status ?? 1);
  }

  const bytes = statSync(out).size;
  console.log("\n# Listo");
  console.log(`routeId: ${routeId}`);
  console.log(`file: ${out}`);
  console.log(`byteSize: ${bytes}`);
  console.log("\nFirestore (artifacts.pmtiles):");
  console.log(`  downloadUrl: "https://TU-CDN/${routeId}/basemap.pmtiles"`);
  console.log(`  byteSize: ${bytes}`);
  console.log(`  status: "uploaded"`);
  console.log("\nO en .env:");
  console.log(`  EXPO_PUBLIC_PMTILES_CDN_BASE=https://TU-CDN`);
  console.log(`  → la app buscará ${routeId}/basemap.pmtiles automáticamente`);
}

main();
