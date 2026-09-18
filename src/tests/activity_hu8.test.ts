import {
  ACTIVITY_CONFIG,
  isFreeRecording,
  isFreeSavedActivity,
  isResumableLive,
  toTrekkinActivity,
} from "../core/domain/activity";
import type { LiveActivity } from "../core/domain/activity";
import { StartActivityUseCase } from "../core/application/activity/StartActivity.usecase";
import { StartFreeRecordingUseCase } from "../core/application/activity/StartFreeRecording.usecase";
import { BeginTrackingUseCase } from "../core/application/activity/BeginTracking.usecase";
import { RecordPointUseCase } from "../core/application/activity/RecordPoint.usecase";
import { FinishActivityUseCase } from "../core/application/activity/FinishActivity.usecase";
import { ExportTrackFileUseCase } from "../core/application/activity/ExportTrackFile.usecase";
import type { RouteModel } from "../core/domain/types";

interface TestResult {
  id: string;
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `HU-08-${results.length + 1}`,
    criterion,
    passed,
    detail,
  });
}

const routeFixture: RouteModel = {
  id: "route-1",
  title: "Huayna Potosí - HU-08 accuracy",
  description: "Ruta de prueba HU-08.",
  region: "La Paz",
  startPoint: { name: "Base", lat: -16.35, lng: -68.13 },
  endPoint: { name: "Cima", lat: -16.36, lng: -68.12 },
  distanceKm: 5,
  durationMinutes: 120,
  difficulty: "moderado",
  modality: "acompañado",
  status: "published",
  isPrivate: false,
  creatorId: "owner",
  creatorName: "Guía",
  waypoints: [
    { lat: -16.35, lng: -68.13 },
    { lat: -16.352, lng: -68.128 },
    { lat: -16.355, lng: -68.125 },
    { lat: -16.36, lng: -68.12 },
  ],
  checkpoints: [],
  photos: [],
  createdAt: 1717000000000,
  updatedAt: 1717000000000,
};

async function newInProgress(): Promise<LiveActivity> {
  const ready = await StartActivityUseCase(
    { routeId: "route-1", userId: "user-123", userName: "Tester" },
    { getRoute: async () => routeFixture },
  );
  return BeginTrackingUseCase(ready);
}

function point(lat: number, lng: number, accuracy?: number) {
  return {
    lat,
    lng,
    timestamp: Date.now(),
    ...(accuracy === undefined ? {} : { accuracy }),
  };
}

async function runActivityHu8Tests(): Promise<TestResult[]> {
  recordTest(
    "ACTIVITY_CONFIG.MAX_ACCURACY_M es 25",
    ACTIVITY_CONFIG.MAX_ACCURACY_M === 25,
    `MAX_ACCURACY_M=${ACTIVITY_CONFIG.MAX_ACCURACY_M}`,
  );

  const base = await newInProgress();

  const afterAcc10 = await RecordPointUseCase(
    base,
    point(-16.351, -68.129, 10),
  );
  recordTest(
    "accuracy 10 m se acepta (suma punto)",
    afterAcc10.recordedPoints.length === 1,
    `pts=${afterAcc10.recordedPoints.length}`,
  );

  const afterAcc40 = await RecordPointUseCase(
    afterAcc10,
    point(-16.3516, -68.1284, 40),
  );
  recordTest(
    "accuracy 40 m se descarta (no suma punto, no lanza)",
    afterAcc40.recordedPoints.length === 1,
    `pts=${afterAcc40.recordedPoints.length} (esperado 1)`,
  );

  const afterUndefined = await RecordPointUseCase(
    afterAcc40,
    point(-16.3517, -68.1283),
  );
  const afterNullCompat = afterUndefined.recordedPoints.length === 2;
  recordTest(
    "accuracy undefined/null se acepta (compatibilidad HU-06)",
    afterNullCompat,
    `pts=${afterUndefined.recordedPoints.length} (esperado 2)`,
  );

  const with25 = await RecordPointUseCase(
    afterUndefined,
    point(-16.3522, -68.1278, 25),
  );
  recordTest(
    "accuracy exactamente 25 m se acepta (borde)",
    with25.recordedPoints.length === 3,
    `pts=${with25.recordedPoints.length}`,
  );

  const with26 = await RecordPointUseCase(
    with25,
    point(-16.3528, -68.1272, 26),
  );
  recordTest(
    "accuracy 26 m se descarta (justo sobre el umbral)",
    with26.recordedPoints.length === 3,
    `pts=${with26.recordedPoints.length} (esperado 3)`,
  );

  const acc0 = await RecordPointUseCase(with26, point(-16.3529, -68.1271, 0));
  recordTest(
    "accuracy 0 m se acepta",
    acc0.recordedPoints.length === 4,
    `pts=${acc0.recordedPoints.length}`,
  );

  const freeReady = StartFreeRecordingUseCase({
    position: { lat: -16.5, lng: -68.1, altitude: 3640 },
    userId: "user-123",
    userName: "Tester",
  });
  recordTest(
    "StartFreeRecording crea actividad lista desde el GPS actual (sin plan)",
    freeReady.phase === "ready" &&
      freeReady.origin === "free" &&
      freeReady.route.distanceKm === 0 &&
      freeReady.recordedPoints.length === 1,
    `phase=${freeReady.phase} origin=${freeReady.origin}`,
  );

  let freeRejected = 0;
  try {
    StartFreeRecordingUseCase({
      position: { lat: 95, lng: -68.1 },
      userId: "user-123",
      userName: "Tester",
    });
  } catch {
    freeRejected++;
  }
  try {
    StartFreeRecordingUseCase({
      position: { lat: -16.5, lng: -68.1 },
      userId: "  ",
      userName: "Tester",
    });
  } catch {
    freeRejected++;
  }
  recordTest(
    "StartFreeRecording rechaza GPS inválido y usuario ausente",
    freeRejected === 2,
    `rechazos=${freeRejected}/2`,
  );

  let freeLive = await BeginTrackingUseCase(freeReady);
  const freeBaseTs = 1720000000000;
  for (let i = 1; i <= 9; i++) {
    freeLive = await RecordPointUseCase(freeLive, {
      lat: -16.5 + i * 0.0001,
      lng: -68.1,
      timestamp: freeBaseTs + i * 3000,
      accuracy: 8,
      altitude: 3640 + i,
    });
  }
  const freeFinished = await FinishActivityUseCase(freeLive, {
    saveActivity: async () => {},
    saveLocalActivity: async () => {},
  });
  const freeGpx = ExportTrackFileUseCase(freeFinished.saved);
  const freeTrkpts = (freeGpx.content.match(/<trkpt/g) ?? []).length;
  recordTest(
    "Flujo libre acumula 10 puntos y exporta GPX 1.1 multipunto",
    freeFinished.saved.status === "completed" &&
      freeFinished.saved.recordedPoints.length === 10 &&
      freeTrkpts === 10,
    `status=${freeFinished.saved.status} pts=${freeFinished.saved.recordedPoints.length} trkpts=${freeTrkpts}`,
  );

  const legacyFree: LiveActivity = {
    ...freeReady,
    origin: undefined,
    route: { ...freeReady.route, routeId: "free-123" },
  };
  const routeLive: LiveActivity = { ...freeReady, origin: "route" as const };
  recordTest(
    "isFreeRecording distingue libre (origin/prefijo free-) de ruta/plan",
    isFreeRecording(freeReady) === true &&
      isFreeRecording(legacyFree) === true &&
      isFreeRecording(routeLive) === false &&
      isFreeRecording(null) === false,
    `free=${isFreeRecording(freeReady)} legacy=${isFreeRecording(legacyFree)} route=${isFreeRecording(routeLive)}`,
  );

  const mk = (
    origin: "free" | "route" | "plan",
    phase: LiveActivity["phase"],
  ): LiveActivity => ({ ...base, origin, phase });
  const activityResumes = (live: LiveActivity | null) =>
    isResumableLive(live) && !isFreeRecording(live);
  const freeResumes = (live: LiveActivity | null) =>
    isResumableLive(live) && isFreeRecording(live);
  const failedGates = [
    [
      "ACTIVIDAD GPS ignora libre pausada",
      activityResumes(mk("free", "paused")) === false,
    ],
    [
      "ACTIVIDAD GPS recupera ruta pausada",
      activityResumes(mk("route", "paused")) === true,
    ],
    [
      "GRABAR RUTA recupera libre pausada",
      freeResumes(mk("free", "paused")) === true,
    ],
    [
      "GRABAR RUTA ignora ruta pausada",
      freeResumes(mk("route", "paused")) === false,
    ],
    [
      "PLANIFICAR recupera plan pausado",
      activityResumes(mk("plan", "paused")) === true,
    ],
    [
      "nadie recupera finalizada",
      activityResumes(mk("route", "finished")) === false,
    ],
  ].filter(([, ok]) => !ok);
  recordTest(
    "Recuperación separada por flujo (libre/ruta/plan)",
    failedGates.length === 0,
    failedGates.length === 0
      ? "6/6 condiciones"
      : `fallan: ${failedGates.map(([n]) => n).join("; ")}`,
  );

  const freeSaved = toTrekkinActivity({ ...freeLive, origin: "free" as const });
  const routeSaved = toTrekkinActivity({ ...base, origin: "route" as const });
  recordTest(
    "Resumen/detalle ocultan RESTANTE solo en libres (guiadas lo conservan)",
    freeSaved.origin === "free" &&
      isFreeSavedActivity(freeSaved) === true &&
      isFreeSavedActivity(routeSaved) === false,
    `free=${isFreeSavedActivity(freeSaved)} route=${isFreeSavedActivity(routeSaved)}`,
  );

  return results;
}

if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("activity_hu8"))
) {
  console.log("\n============================================================");
  console.log("       TREKKIN APP — SUITE DE ACEPTACIÓN HU-08              ");
  console.log("============================================================\n");

  runActivityHu8Tests()
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
        console.log(
          "🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-08 PASARON AL 100%.\n",
        );
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Error fatal al ejecutar pruebas:", err);
      process.exit(1);
    });
}

export { runActivityHu8Tests };
