/**
 * Automated Acceptance Test Suite: HU-03 — Map Service & Bounding Box
 * Clean Architecture - Pure Domain Geo Calculations
 */

import {
  computeBoundingBox,
  boundsToRegion,
  estimateTileCount,
  estimateDownloadSizeMB,
} from "../core/domain/geoBounds";
import {
  ONLINE_STYLE_DARK_URL,
  ONLINE_STYLE_LIGHT_URL,
  SATELLITE_TILE_URL,
  buildSatelliteStyle,
  resolveOnlineMapStyle,
} from "../infrastructure/map/mapStyle";
import type { Coordinates } from "../core/domain/types";

interface TestResult {
  id: string;
  hu: "HU-03";
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `HU-03-${results.length + 1}`,
    hu: "HU-03",
    criterion,
    passed,
    detail,
  });
}

// T1: computeBoundingBox con puntos reales de La Paz
const lapazTrack: Coordinates[] = [
  { lat: -16.500, lng: -68.150 },
  { lat: -16.480, lng: -68.120 },
  { lat: -16.460, lng: -68.100 },
];

const bbox = computeBoundingBox(lapazTrack, 0.1);
const t1Passed =
  bbox.minLat < -16.500 &&
  bbox.maxLat > -16.460 &&
  bbox.minLng < -68.150 &&
  bbox.maxLng > -68.100;
recordTest(
  "T1: computeBoundingBox incluye todos los puntos y aplica margen",
  t1Passed,
  `Bounds: lat [${bbox.minLat.toFixed(3)}, ${bbox.maxLat.toFixed(3)}], lng [${bbox.minLng.toFixed(3)}, ${bbox.maxLng.toFixed(3)}]`
);

// T2: boundsToRegion genera deltas positivos y centra adecuadamente
const region = boundsToRegion(bbox);
const t2Passed =
  region.latitudeDelta > 0 &&
  region.longitudeDelta > 0 &&
  region.latitude < bbox.maxLat &&
  region.latitude > bbox.minLat;
recordTest(
  "T2: boundsToRegion genera deltas positivos y coordenadas centrales",
  t2Passed,
  `Centro: (${region.latitude.toFixed(3)}, ${region.longitude.toFixed(3)}), Delta: (${region.latitudeDelta.toFixed(3)}, ${region.longitudeDelta.toFixed(3)})`
);

// T3: estimateTileCount calcula teselas para zoom 12 a 15
const tileCount = estimateTileCount(bbox, 12, 15);
const t3Passed = tileCount > 0 && tileCount < 500;
recordTest(
  "T3: estimateTileCount calcula cantidad razonable de teselas para una ruta",
  t3Passed,
  `Teselas estimadas para zooms 12–15: ${tileCount}`
);

// T4: estimateDownloadSizeMB devuelve tamaño proporcional en MB
const sizeMB = estimateDownloadSizeMB(tileCount);
const t4Passed = sizeMB > 0 && sizeMB < 50;
recordTest(
  "T4: estimateDownloadSizeMB estima tamaño coherente en MB",
  t4Passed,
  `Tamaño estimado: ${sizeMB} MB`
);

// T5: computeBoundingBox maneja array vacío sin crashear
const emptyBbox = computeBoundingBox([]);
const t5Passed =
  emptyBbox.minLat !== undefined &&
  emptyBbox.maxLat !== undefined &&
  emptyBbox.minLat < emptyBbox.maxLat;
recordTest(
  "T5: computeBoundingBox con array vacío entrega región por defecto de Bolivia",
  t5Passed,
  `Default Bolivia bounds: [${emptyBbox.minLng}, ${emptyBbox.minLat}, ${emptyBbox.maxLng}, ${emptyBbox.maxLat}]`
);

// T6: variantes online — dark/light por URL del mismo proveedor, satélite inline
const darkStyle = resolveOnlineMapStyle("dark");
const lightStyle = resolveOnlineMapStyle("light");
const satStyle = resolveOnlineMapStyle("satellite");
const t6Passed =
  darkStyle.kind === "url" && darkStyle.url === ONLINE_STYLE_DARK_URL &&
  lightStyle.kind === "url" && lightStyle.url === ONLINE_STYLE_LIGHT_URL &&
  lightStyle.url.includes("bright") &&
  satStyle.kind === "inline";
recordTest(
  "T6: resolveOnlineMapStyle entrega dark/light por URL y satélite inline",
  t6Passed,
  `dark=${ONLINE_STYLE_DARK_URL} light=${ONLINE_STYLE_LIGHT_URL} sat=inline`
);

// T7: estilo satelital v8 con raster Esri y atribución
const satJson = buildSatelliteStyle();
const satSource = (satJson.sources as Record<string, any>)["esri-imagery"];
const t7Passed =
  satJson.version === 8 &&
  satSource?.type === "raster" &&
  Array.isArray(satSource?.tiles) &&
  String(satSource.tiles[0]).includes("arcgisonline.com") &&
  String(satSource.tiles[0]).includes("{z}/{y}/{x}") &&
  typeof satSource?.attribution === "string";
recordTest(
  "T7: buildSatelliteStyle es v8 con raster Esri XYZ y atribución",
  t7Passed,
  `tiles=${satSource?.tiles?.[0]}`
);

// T8: URL de teselas satelitales con formato XYZ
recordTest(
  "T8: SATELLITE_TILE_URL usa plantilla XYZ de Esri World Imagery",
  SATELLITE_TILE_URL.includes("{z}") && SATELLITE_TILE_URL.includes("{y}") && SATELLITE_TILE_URL.includes("{x}"),
  SATELLITE_TILE_URL
);

// Imprimir reporte
console.log("\n============================================================");
console.log("       TREKKIN APP — SUITE MAP SERVICE (HU-03)              ");
console.log("============================================================\n");

let allPassed = true;
for (const r of results) {
  const icon = r.passed ? "[✓ PASS]" : "[✗ FAIL]";
  console.log(`${icon} [${r.id}] ${r.criterion}`);
  console.log(`        Detalle: ${r.detail}\n`);
  if (!r.passed) allPassed = false;
}

console.log("------------------------------------------------------------");
console.log(`Total Pruebas: ${results.length} | Aprobadas: ${results.filter(r => r.passed).length} | Fallidas: ${results.filter(r => !r.passed).length}`);
console.log("------------------------------------------------------------\n");

if (!allPassed) {
  console.error("❌ Fallaron pruebas en HU-03 Map Service");
  process.exit(1);
} else {
  console.log("🎉 TODAS LAS PRUEBAS DE HU-03 MAP SERVICE PASARON AL 100%.\n");
}
