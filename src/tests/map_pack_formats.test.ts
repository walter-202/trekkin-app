/**
 * Packs de mapa base (HU-04): PMTiles vs MBTiles.
 * Dominio puro — sin MapLibre ni sistema de archivos.
 */

import {
  detectMapPack,
  resolveOfflinePack,
  toPmtilesProtocolUrl,
} from "../core/domain/mapPackFormats";
import { ResolveOfflinePackUseCase } from "../core/application/offline/ResolveOfflinePack.usecase";
import { buildOfflineVectorStyle } from "../infrastructure/map/mapStyle";
import { OfflinePackPathSchema } from "../core/domain/offline.schemas";

interface TestResult {
  id: string;
  hu: "HU-04";
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `PACK-${results.length + 1}`,
    hu: "HU-04",
    criterion,
    passed,
    detail,
  });
}

const pmtilesHeader = new TextEncoder().encode("PMTiles\u0003");
const sqliteHeader = new TextEncoder().encode("SQLite format 3\u0000");

const t1 = detectMapPack({
  path: "https://cdn.example/cordillera.pmtiles",
});
recordTest(
  "T1: extensión .pmtiles detecta pack V1 sin leer bytes",
  t1.kind === "pmtiles" && t1.via === "extension",
  `kind=${t1.kind} via=${t1.via}`,
);

const t2 = detectMapPack({
  path: "file:///packs/ruta.mbtiles",
});
recordTest(
  "T2: extensión .mbtiles detecta pack SQLite (V2 / conversión)",
  t2.kind === "mbtiles" && t2.via === "extension",
  `kind=${t2.kind} via=${t2.via}`,
);

const t3 = detectMapPack({
  path: "mystery.bin",
  headerBytes: pmtilesHeader,
});
recordTest(
  "T3: magia PMTiles gana sobre un nombre sin extensión conocida",
  t3.kind === "pmtiles" && t3.via === "magic",
  `kind=${t3.kind} via=${t3.via}`,
);

const t4 = detectMapPack({
  path: "falso.pmtiles",
  headerBytes: sqliteHeader,
});
recordTest(
  "T4: magia SQLite identifica MBTiles aunque el nombre diga .pmtiles",
  t4.kind === "mbtiles" && t4.via === "magic",
  `kind=${t4.kind} via=${t4.via}`,
);

let t5Passed = false;
try {
  detectMapPack({ path: "tiles/12/0/0.png" });
} catch (e: unknown) {
  t5Passed = e instanceof Error && e.message.includes("pmtiles");
}
recordTest(
  "T5: rechaza árbol PNG / tesela suelta",
  t5Passed,
  "Lanza error en español pidiendo PMTiles o MBTiles",
);

const pmtilesResolved = ResolveOfflinePackUseCase({
  path: "https://tiles.example/lapaz.pmtiles",
});
recordTest(
  "T6: ResolveOfflinePack V1 entrega protocolUrl pmtiles://",
  pmtilesResolved.usableInV1 === true &&
    pmtilesResolved.protocolUrl ===
      "pmtiles://https://tiles.example/lapaz.pmtiles",
  String(pmtilesResolved.protocolUrl),
);

const mbtilesResolved = resolveOfflinePack({
  path: "/storage/ruta.mbtiles",
});
recordTest(
  "T7: MBTiles no es usable en V1 y pide conversión a PMTiles",
  mbtilesResolved.usableInV1 === false &&
    mbtilesResolved.protocolUrl === null &&
    (mbtilesResolved.message ?? "").includes("pmtiles convert"),
  mbtilesResolved.message ?? "(sin mensaje)",
);

const alreadyPrefixed = toPmtilesProtocolUrl(
  "pmtiles://https://tiles.example/x.pmtiles",
);
recordTest(
  "T8: toPmtilesProtocolUrl no duplica el esquema",
  alreadyPrefixed === "pmtiles://https://tiles.example/x.pmtiles",
  alreadyPrefixed,
);

const style = buildOfflineVectorStyle("pmtiles://https://tiles.example/x.pmtiles");
recordTest(
  "T9: estilo offline apunta al source vectorial del pack",
  style.version === 8 &&
    (style.sources.openmaptiles as { url?: string }).url ===
      "pmtiles://https://tiles.example/x.pmtiles" &&
    style.layers.some((l) => l.id === "water"),
  `layers=${style.layers.length}`,
);

let t10Passed = false;
try {
  OfflinePackPathSchema.parse("   ");
} catch {
  t10Passed = true;
}
recordTest(
  "T10: Zod rechaza path de pack vacío",
  t10Passed,
  "OfflinePackPathSchema",
);

console.log("\n============================================================");
console.log("       TREKKIN APP — SUITE PACKS PMTILES / MBTILES (HU-04) ");
console.log("============================================================\n");

let allPassed = true;
for (const r of results) {
  const icon = r.passed ? "[✓ PASS]" : "[✗ FAIL]";
  console.log(`${icon} [${r.id}] ${r.criterion}`);
  console.log(`        Detalle: ${r.detail}\n`);
  if (!r.passed) allPassed = false;
}

console.log("------------------------------------------------------------");
console.log(
  `Total Pruebas: ${results.length} | Aprobadas: ${results.filter((r) => r.passed).length} | Fallidas: ${results.filter((r) => !r.passed).length}`,
);
console.log("------------------------------------------------------------\n");

if (!allPassed) {
  console.error("❌ Fallaron pruebas de formatos de pack");
  process.exit(1);
}
console.log("🎉 TODAS LAS PRUEBAS DE PACKS PMTILES/MBTILES PASARON.\n");
