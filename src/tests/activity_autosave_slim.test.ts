import {
  restoreLiveFromHeader,
  sliceWindow,
  slimLiveForAutosave,
  TRACK_WINDOW_SIZE,
} from "../core/application/activity/TrackWindow";
import { StartFreeRecordingUseCase } from "../core/application/activity/StartFreeRecording.usecase";
import { BeginTrackingUseCase } from "../core/application/activity/BeginTracking.usecase";
import { RecordPointUseCase } from "../core/application/activity/RecordPoint.usecase";
import type { LiveActivity } from "../core/domain/activity";

interface TestResult {
  id: string;
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `SLIM-${results.length + 1}`,
    criterion,
    passed,
    detail,
  });
}

async function liveWithPoints(count: number): Promise<LiveActivity> {
  const prepared = StartFreeRecordingUseCase({
    position: {
      lat: -16.5,
      lng: -68.1,
      altitude: 3640,
    },
    userId: "user-123",
    userName: "Tester",
  });
  let live = await BeginTrackingUseCase(prepared);
  const base = 1720000000000;
  for (let i = 1; i <= count; i++) {
    live = await RecordPointUseCase(live, {
      lat: -16.5 + i * 0.0001,
      lng: -68.1,
      timestamp: base + i * 3000,
      accuracy: 8,
    });
  }
  return { ...live, totalDistanceKm: 0.123 };
}

async function runAutosaveSlimTests(): Promise<TestResult[]> {
  const live = await liveWithPoints(5);

  const slim = slimLiveForAutosave(live);
  const slimJson = JSON.parse(JSON.stringify(slim)) as LiveActivity;
  recordTest(
    "Autosave nuevo NO contiene recordedPoints completos",
    slimJson.recordedPoints.length === 0,
    `pts=${slimJson.recordedPoints.length} (original ${live.recordedPoints.length})`,
  );

  recordTest(
    "Autosave conserva estado: id/origin/phase/total/checkpoints/route",
    slim.id === live.id &&
      slim.origin === "free" &&
      slim.phase === live.phase &&
      slim.totalDistanceKm === 0.123 &&
      slim.route.routeId === live.route.routeId &&
      slim.completedCheckpoints.length === live.completedCheckpoints.length,
    `origin=${slim.origin} total=${slim.totalDistanceKm}`,
  );

  const windowFromDb = live.recordedPoints.slice(-3);
  const restored = restoreLiveFromHeader(slim, () => windowFromDb);
  recordTest(
    "Sesión nueva se recupera con ventana SQLite + total conservado",
    restored.recordedPoints.length === 3 &&
      restored.totalDistanceKm === 0.123 &&
      restored.id === live.id &&
      restored.phase === live.phase,
    `ventana=${restored.recordedPoints.length} total=${restored.totalDistanceKm}`,
  );

  const legacy = { ...live };
  let loaderCalled = false;
  const restoredLegacy = restoreLiveFromHeader(legacy, () => {
    loaderCalled = true;
    return [];
  });
  recordTest(
    "Sesión legacy con array completo: compatible, sin tocar SQLite",
    restoredLegacy.recordedPoints.length === live.recordedPoints.length &&
      loaderCalled === false,
    `pts=${restoredLegacy.recordedPoints.length}`,
  );

  const big = await liveWithPoints(0);
  const manyPoints = Array.from({ length: 350 }, (_, i) => ({
    lat: -16.5 + i * 0.00001,
    lng: -68.1,
    timestamp: 1720000000000 + i,
  }));
  const bigLive: LiveActivity = { ...big, recordedPoints: manyPoints };
  const bigSlim = slimLiveForAutosave(bigLive);
  const bigRestored = restoreLiveFromHeader(bigSlim, () =>
    sliceWindow(manyPoints, TRACK_WINDOW_SIZE),
  );
  recordTest(
    "Ventana de 350 → 300 en memoria; SQLite aportaría el resto",
    bigSlim.recordedPoints.length === 0 &&
      bigRestored.recordedPoints.length === TRACK_WINDOW_SIZE,
    `slim=${bigSlim.recordedPoints.length} ventana=${bigRestored.recordedPoints.length}`,
  );

  const slimBytes = JSON.stringify(slim).length;
  const fullBytes = JSON.stringify(live).length;
  recordTest(
    "Autosave adelgazado es O(1): no crece con los puntos",
    slimBytes < fullBytes,
    `slim=${slimBytes}B full=${fullBytes}B`,
  );

  return results;
}

if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("activity_autosave_slim"))
) {
  console.log("\n============================================================");
  console.log("       TREKKIN APP — SUITE AUTOSAVE SLIM (ETAPA 3)          ");
  console.log("============================================================\n");

  runAutosaveSlimTests()
    .then((allResults) => {
      let failedCount = 0;
      allResults.forEach((r) => {
        const statusIcon = r.passed ? "✓ PASS" : "✗ FAIL";
        console.log(`[${statusIcon}] [${r.id}] ${r.criterion}`);
        console.log(`        Detalle: ${r.detail}\n`);
        if (!r.passed) failedCount++;
      });

      console.log(
        "------------------------------------------------------------",
      );
      console.log(
        `Total Pruebas: ${allResults.length} | Aprobadas: ${allResults.length - failedCount} | Fallidas: ${failedCount}`,
      );
      console.log(
        "------------------------------------------------------------\n",
      );

      if (failedCount > 0) {
        process.exit(1);
      } else {
        console.log("🎉 SUITE AUTOSAVE SLIM PASÓ AL 100%.\n");
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Error fatal al ejecutar pruebas:", err);
      process.exit(1);
    });
}

export { runAutosaveSlimTests };
