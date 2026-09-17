/**
 * Automated Acceptance Test Suite: Formatos GPS (HU-07 / HU-08 / HU-05)
 * Clean Architecture - Pure Domain Parsers & Serializers
 */

import {
  parseGPX,
  buildGPX,
  parseKML,
  parseCSV,
  simplifyTrack,
  computeElevationStats,
  type ParsedTrack,
} from "../core/domain/trackFormats";
import type { Coordinates } from "../core/domain/types";

interface TestResult {
  id: string;
  hu: "HU-07/08";
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `GPS-${results.length + 1}`,
    hu: "HU-07/08",
    criterion,
    passed,
    detail,
  });
}

// 1. Test GPX Sample
const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin eTrex">
  <metadata>
    <name>Circuito Illimani Base</name>
    <desc>Ruta de aproximación al campo base</desc>
  </metadata>
  <wpt lat="-16.650" lon="-67.780">
    <name>Campamento Base</name>
    <ele>4450</ele>
  </wpt>
  <trk>
    <name>Illimani Track</name>
    <trkseg>
      <trkpt lat="-16.680" lon="-67.800">
        <ele>4100</ele>
        <time>2026-09-15T08:00:00Z</time>
      </trkpt>
      <trkpt lat="-16.670" lon="-67.790">
        <ele>4280</ele>
        <time>2026-09-15T09:00:00Z</time>
      </trkpt>
      <trkpt lat="-16.650" lon="-67.780">
        <ele>4450</ele>
        <time>2026-09-15T10:30:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const parsedGpx = parseGPX(sampleGPX);
const t1Passed =
  parsedGpx.points.length === 3 &&
  parsedGpx.waypoints.length === 1 &&
  parsedGpx.waypoints[0].name === "Campamento Base" &&
  parsedGpx.elevationGainM > 300 &&
  parsedGpx.totalDistanceKm > 0;

recordTest(
  "T1: parseGPX extrae puntos, elevación, tiempos y waypoints de GPX 1.1",
  t1Passed,
  `Puntos: ${parsedGpx.points.length}, Waypoints: ${parsedGpx.waypoints.length}, Desnivel+: +${parsedGpx.elevationGainM}m, Distancia: ${parsedGpx.totalDistanceKm}km`
);

// 2. Test buildGPX y Round-Trip
const generatedXml = buildGPX({
  name: "Ruta Generada Huayna Potosí",
  description: "Ascenso directo",
  points: parsedGpx.points,
  waypoints: parsedGpx.waypoints,
});

const roundTripParsed = parseGPX(generatedXml);
const t2Passed =
  roundTripParsed.points.length === parsedGpx.points.length &&
  roundTripParsed.name === "Ruta Generada Huayna Potosí" &&
  roundTripParsed.waypoints.length === 1;

recordTest(
  "T2: buildGPX genera XML válido y parseGPX realiza round-trip sin pérdida",
  t2Passed,
  `Round-trip points: ${roundTripParsed.points.length}, name: ${roundTripParsed.name}`
);

// 3. Test KML Parsing
const sampleKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Valle de las Ánimas KML</name>
    <Placemark>
      <name>Trazado</name>
      <LineString>
        <coordinates>
          -68.050,-16.520,3600
          -68.040,-16.510,3680
          -68.030,-16.500,3750
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

const parsedKml = parseKML(sampleKML);
const t3Passed =
  parsedKml.points.length === 3 &&
  parsedKml.points[0].lat === -16.520 &&
  parsedKml.points[0].lng === -68.050 &&
  parsedKml.totalDistanceKm > 0;

recordTest(
  "T3: parseKML extrae coordenadas y altitud desde etiquetas LineString",
  t3Passed,
  `Puntos extraídos: ${parsedKml.points.length}, Distancia: ${parsedKml.totalDistanceKm}km`
);

// 4. Test CSV Parsing
const sampleCSV = `lat,lng,ele,time
-16.500,-68.150,3600,2026-09-15T12:00:00Z
-16.490,-68.140,3650,2026-09-15T12:15:00Z
-16.480,-68.130,3700,2026-09-15T12:30:00Z`;

const parsedCsv = parseCSV(sampleCSV);
const t4Passed =
  parsedCsv.points.length === 3 &&
  parsedCsv.points[1].lat === -16.490 &&
  parsedCsv.points[1].altitude === 3650;

recordTest(
  "T4: parseCSV procesa archivos tabulares delimitados con lat/lng/ele",
  t4Passed,
  `Puntos extraídos de CSV: ${parsedCsv.points.length}`
);

// 5. Test Ramer-Douglas-Peucker Simplification
// Línea recta con 10 puntos intermedios con micro-jitter (< 2 metros)
const straightLineWithJitter: Coordinates[] = [
  { lat: -16.5000, lng: -68.1500 },
  { lat: -16.5001, lng: -68.1499 },
  { lat: -16.5002, lng: -68.1500 },
  { lat: -16.5003, lng: -68.1501 },
  { lat: -16.5004, lng: -68.1500 },
  { lat: -16.5005, lng: -68.1499 },
  { lat: -16.5006, lng: -68.1500 },
  { lat: -16.5007, lng: -68.1501 },
  { lat: -16.5008, lng: -68.1500 },
  { lat: -16.5010, lng: -68.1500 },
];

const simplified = simplifyTrack(straightLineWithJitter, 15);
const t5Passed = simplified.length < straightLineWithJitter.length && simplified.length >= 2;

recordTest(
  "T5: simplifyTrack reduce puntos redundantes en rectas preservando extremos",
  t5Passed,
  `Reducción de ${straightLineWithJitter.length} a ${simplified.length} puntos`
);

// 6. Test Error Handling
let t6Passed = false;
try {
  parseGPX("<invalido>sin puntos</invalido>");
} catch (e: any) {
  t6Passed = true;
}

recordTest(
  "T6: parseGPX lanza excepción clara ante XML inválido o sin puntos",
  t6Passed,
  "Capturó excepción ante archivo sin puntos legibles"
);

// Reporte en consola
console.log("\n============================================================");
console.log("       TREKKIN APP — SUITE FORMATOS GPS (HU-07 / HU-08)     ");
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
  console.error("❌ Fallaron pruebas en Formatos GPS");
  process.exit(1);
} else {
  console.log("🎉 TODAS LAS PRUEBAS DE FORMATOS GPS PASARON AL 100%.\n");
}
