/**
 * Automated Acceptance Test Suite: HU-08 (Seguimiento GPS y Grabación de Actividad)
 * Clean Architecture — Casos de uso y esquemas de dominio para grabación GPS e hitos/checkpoints.
 *
 * Scope:
 * - Validación Zod de categorías de paradas (CheckpointCategorySchema).
 * - Registro de paradas/hitos en vivo (AddCheckpointUseCase).
 * - Cálculo de ritmo (min/km), velocidad (km/h) y desnivel (gain/loss).
 * - Validación del esquema completo TrekkinActivitySchema.
 */

import {
  CHECKPOINT_CATEGORY_VALUES,
  CheckpointCategorySchema,
  CreateCheckpointSchema,
  TrekkinActivitySchema,
} from "../core/domain/activity.schemas";
import { AddCheckpointUseCase } from "../core/application/activity/AddCheckpoint.usecase";
import { RecordPointUseCase } from "../core/application/activity/RecordPoint.usecase";
import { StartRecordingFromPlanUseCase } from "../core/application/activity/StartRecordingFromPlan.usecase";
import {
  StartFreeRecordingUseCase,
  seedQualityCheck,
  SEED_MAX_AGE_MS,
} from "../core/application/activity/StartFreeRecording.usecase";
import { BeginTrackingUseCase } from "../core/application/activity/BeginTracking.usecase";
import { FinishActivityUseCase } from "../core/application/activity/FinishActivity.usecase";
import { ExportTrackFileUseCase } from "../core/application/activity/ExportTrackFile.usecase";
import {
  ACTIVITY_CONFIG,
  isFreeRecording,
  isResumableLive,
} from "../core/domain/activity";
import type { RoutePlan } from "../core/domain/plan";
import {
  calculatePaceMinPerKm,
  calculateSpeedKmh,
  calculateElevationDeltaM,
  haversineDistanceKm,
} from "../core/domain/calculations";
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
    id: `HU-08-${results.length + 1}`,
    criterion,
    passed,
    detail,
  });
}

const baseLiveActivity: LiveActivity = {
  id: "activity-live-test",
  userId: "user-cruz-123",
  userName: "Ramos Cruz",
  route: {
    routeId: "route-test",
    routeTitle: "Ruta de prueba",
    startPoint: { name: "Inicio", lat: -16.5, lng: -68.1 },
    endPoint: { name: "Fin", lat: -16.51, lng: -68.11 },
    waypoints: [{ lat: -16.5, lng: -68.1 }],
    checkpoints: [],
    distanceKm: 2.0,
    durationMinutes: 60,
    difficulty: "moderado",
  },
  phase: "in_progress",
  startedAt: 1720000000000,
  lastResumedAt: 1720000000000,
  accumulatedActiveMs: 30000,
  recordedPoints: [
    { lat: -16.5, lng: -68.1, timestamp: 1720000000000 },
    { lat: -16.505, lng: -68.105, timestamp: 1720000015000 },
  ],
  completedCheckpoints: [],
  createdAt: 1720000000000,
  updatedAt: 1720000030000,
};

async function runTests() {
  console.log("============================================================");
  console.log(
    "       TREKKIN APP — SUITE DE ACEPTACIÓN HU-08 (GRABACIÓN GPS) ",
  );
  console.log("============================================================\n");

  // 1. Categorías de paradas válidas
  try {
    for (const cat of CHECKPOINT_CATEGORY_VALUES) {
      CheckpointCategorySchema.parse(cat);
    }
    recordTest(
      "CheckpointCategorySchema acepta las 7 categorías de paradas permitidas",
      true,
      `Categorías aceptadas: ${CHECKPOINT_CATEGORY_VALUES.join(", ")}`,
    );
  } catch (e: any) {
    recordTest(
      "CheckpointCategorySchema acepta categorías válidas",
      false,
      e.message,
    );
  }

  // 2. Rechazo de categoría inválida
  try {
    CheckpointCategorySchema.parse("categoria_falsa");
    recordTest(
      "CheckpointCategorySchema rechaza categoría inválida",
      false,
      "Debería fallar",
    );
  } catch (e: any) {
    recordTest(
      "CheckpointCategorySchema rechaza categoría inválida",
      true,
      "Rechazada correctamente",
    );
  }

  // 3. Validación de CreateCheckpointSchema con datos válidos
  try {
    const validCp = CreateCheckpointSchema.parse({
      name: "Vertiente de agua dulce",
      category: "agua",
      lat: -16.502,
      lng: -68.103,
      notes: "Agua cristalina apta para filtrar",
    });
    recordTest(
      "CreateCheckpointSchema valida parada con nombre, categoría y nota opcional",
      true,
      `Nombre: ${validCp.name} · Categoría: ${validCp.category}`,
    );
  } catch (e: any) {
    recordTest(
      "CreateCheckpointSchema valida parada correcta",
      false,
      e.message,
    );
  }

  // 4. Rechazo de parada sin nombre
  try {
    CreateCheckpointSchema.parse({
      name: "   ",
      category: "camping",
      lat: -16.5,
      lng: -68.1,
    });
    recordTest(
      "CreateCheckpointSchema rechaza parada con nombre vacío",
      false,
      "Debería fallar",
    );
  } catch (e: any) {
    recordTest(
      "CreateCheckpointSchema rechaza parada con nombre vacío",
      true,
      "Rechazada: nombre obligatorio",
    );
  }

  // 5. Rechazo de parada con coordenadas fuera de rango
  try {
    CreateCheckpointSchema.parse({
      name: "Mirador del cóndor",
      category: "vista",
      lat: 95.0,
      lng: -68.1,
    });
    recordTest(
      "CreateCheckpointSchema rechaza latitud > 90",
      false,
      "Debería fallar",
    );
  } catch (e: any) {
    recordTest(
      "CreateCheckpointSchema rechaza latitud > 90",
      true,
      "Latitud 95 rechazada",
    );
  }

  // 6. AddCheckpointUseCase añade parada a newCheckpoints y su ID a completedCheckpoints
  try {
    const res = AddCheckpointUseCase(baseLiveActivity, {
      name: "Cueva de descanso",
      category: "descanso",
      lat: -16.504,
      lng: -68.104,
      notes: "Buen resguardo del viento",
    });

    const hasNew = res.activity.newCheckpoints?.some(
      (c) => c.name === "Cueva de descanso",
    );
    const hasCompletedId = res.activity.completedCheckpoints.includes(
      res.checkpoint.id,
    );

    recordTest(
      "AddCheckpointUseCase registra el checkpoint en newCheckpoints y completedCheckpoints",
      Boolean(hasNew && hasCompletedId),
      `Checkpoint ID: ${res.checkpoint.id} · newCheckpoints count: ${res.activity.newCheckpoints?.length}`,
    );
  } catch (e: any) {
    recordTest("AddCheckpointUseCase registra el checkpoint", false, e.message);
  }

  // 7. Cálculo de ritmo (pace min/km)
  try {
    // 5 km en 1500 segundos (25 min) -> 5 min/km
    const pace = calculatePaceMinPerKm(5.0, 1500);
    recordTest(
      "calculatePaceMinPerKm calcula el ritmo correcto en min/km (formato mm:ss)",
      pace === "5:00",
      `Ritmo para 5km en 25min: ${pace} (esperado 5:00)`,
    );
  } catch (e: any) {
    recordTest("calculatePaceMinPerKm calcula ritmo", false, e.message);
  }

  // 8. Cálculo de velocidad (speed km/h)
  try {
    // 10 km en 3600 s (1 h) -> 10 km/h
    const speed = calculateSpeedKmh(10.0, 3600);
    recordTest(
      "calculateSpeedKmh calcula la velocidad promedio en km/h",
      speed === 10,
      `Velocidad: ${speed} km/h`,
    );
  } catch (e: any) {
    recordTest("calculateSpeedKmh calcula velocidad", false, e.message);
  }

  // 9. Cálculo de desnivel (elevation delta)
  try {
    const pointsWithAlt = [
      { lat: -16.5, lng: -68.1, altitude: 3600 },
      { lat: -16.502, lng: -68.102, altitude: 3750 }, // +150
      { lat: -16.504, lng: -68.104, altitude: 3700 }, // -50
      { lat: -16.506, lng: -68.106, altitude: 3820 }, // +120
    ];
    const { gainM, lossM } = calculateElevationDeltaM(pointsWithAlt);
    recordTest(
      "calculateElevationDeltaM calcula desnivel positivo y negativo acumulado",
      gainM === 270 && lossM === 50,
      `Ganancia: +${gainM}m, Pérdida: -${lossM}m`,
    );
  } catch (e: any) {
    recordTest("calculateElevationDeltaM calcula desnivel", false, e.message);
  }

  // 10. Validación de TrekkinActivitySchema
  try {
    const activityDoc = TrekkinActivitySchema.parse({
      id: "activity-hu08-final",
      userId: "user-123",
      userName: "Ramos Cruz",
      routeId: "ruta-valle-animas",
      routeTitle: "Valle de las Ánimas",
      status: "completed",
      startedAt: 1720000000000,
      finishedAt: 1720003600000,
      distanceCoveredKm: 6.5,
      remainingDistanceKm: 0,
      durationSeconds: 3600,
      recordedPoints: [{ lat: -16.5, lng: -68.1 }],
      completedCheckpoints: ["cp-1", "cp-2"],
      isSynced: true,
      createdAt: 1720000000000,
    });
    recordTest(
      "TrekkinActivitySchema valida un documento de actividad completo para Firestore",
      activityDoc.status === "completed",
      `ID: ${activityDoc.id} · Distancia: ${activityDoc.distanceCoveredKm} km`,
    );
  } catch (e: any) {
    recordTest(
      "TrekkinActivitySchema valida documento completo",
      false,
      e.message,
    );
  }

  // 12. Filtro de precisión GPS (rescate cruz HU-08 / BK-033)
  try {
    const lastCount = baseLiveActivity.recordedPoints.length;
    const noisy = await RecordPointUseCase(baseLiveActivity, {
      lat: -16.5052,
      lng: -68.105,
      timestamp: 1720000100000,
      accuracy: ACTIVITY_CONFIG.MAX_ACCURACY_M + 10,
    });
    const discarded = noisy.recordedPoints.length === lastCount;
    const precise = await RecordPointUseCase(baseLiveActivity, {
      lat: -16.5052,
      lng: -68.105,
      timestamp: 1720000100000,
      accuracy: 8,
    });
    const accepted = precise.recordedPoints.length === lastCount + 1;
    recordTest(
      "RecordPointUseCase descarta lecturas con accuracy > 25 m (cruz HU-08)",
      discarded && accepted,
      `descartado=${discarded} aceptado=${accepted} umbral=${ACTIVITY_CONFIG.MAX_ACCURACY_M}m`,
    );
  } catch (e: any) {
    recordTest(
      "RecordPointUseCase descarta lecturas con accuracy > 25 m (cruz HU-08)",
      false,
      e.message,
    );
  }

  const planFixture: RoutePlan = {
    id: "draft-hu08-1",
    creatorId: "user-cruz-123",
    creatorName: "Ramos Cruz",
    title: "Circuito Valle de la Luna",
    status: "ready_for_gps",
    startPoint: { name: "Ingreso", lat: -16.56, lng: -68.09 },
    endPoint: { name: "Mirador", lat: -16.57, lng: -68.08 },
    waypoints: [],
    difficulty: "moderado",
    startPointConfirmed: true,
    createdAt: 1720000000000,
    updatedAt: 1720000000000,
  };

  try {
    const prepared = StartRecordingFromPlanUseCase({
      plan: planFixture,
      userId: "user-cruz-123",
      userName: "Ramos Cruz",
    });
    const started = await BeginTrackingUseCase(prepared);
    const withPoint = await RecordPointUseCase(started, {
      lat: -16.561,
      lng: -68.089,
      timestamp: Date.now(),
      accuracy: 6,
    });
    const finished = await FinishActivityUseCase(withPoint, {
      saveActivity: async () => {},
      saveLocalActivity: async () => {},
    });
    const gpx = ExportTrackFileUseCase(finished.saved);
    recordTest(
      "StartRecordingFromPlan + Finish + Export GPX queda incompleta lejos del final",
      prepared.phase === "ready" &&
        started.phase === "in_progress" &&
        finished.saved.status === "incomplete" &&
        gpx.fileName.endsWith(".gpx") &&
        gpx.content.includes("<trkpt"),
      `status=${finished.saved.status} file=${gpx.fileName}`,
    );
  } catch (e: any) {
    recordTest(
      "StartRecordingFromPlan + Finish + Export GPX queda incompleta lejos del final",
      false,
      e.message,
    );
  }

  try {
    const nonFree = {
      ...baseLiveActivity,
      origin: "plan" as const,
      route: { ...baseLiveActivity.route, distanceKm: 0 },
    };
    const finished = await FinishActivityUseCase(nonFree, {
      saveActivity: async () => {},
      saveLocalActivity: async () => {},
    });
    recordTest(
      "La regla especial de distanceKm=0 solo completa origen free",
      finished.saved.status === "incomplete",
      `origin=${nonFree.origin} status=${finished.saved.status}`,
    );
  } catch (e: any) {
    recordTest(
      "La regla especial de distanceKm=0 solo completa origen free",
      false,
      e.message,
    );
  }

  try {
    StartRecordingFromPlanUseCase({
      plan: { ...planFixture, startPointConfirmed: false },
      userId: "user-cruz-123",
      userName: "Ramos Cruz",
    });
    recordTest(
      "StartRecordingFromPlan rechaza un plan sin punto de inicio confirmado",
      false,
      "Debería fallar",
    );
  } catch {
    recordTest(
      "StartRecordingFromPlan rechaza un plan sin punto de inicio confirmado",
      true,
      "Rechazado correctamente",
    );
  }

  // 14. StartFreeRecordingUseCase inicia grabación libre con origen "free" y genera GPX multipunto
  try {
    const freeReady = StartFreeRecordingUseCase({
      position: { lat: -16.5, lng: -68.12, altitude: 3600 },
      userId: "user-free-1",
      userName: "Caminante Libre",
    });
    let freeLive = await BeginTrackingUseCase(freeReady);
    for (let i = 1; i <= 3; i++) {
      freeLive = await RecordPointUseCase(freeLive, {
        lat: -16.5 + i * 0.001,
        lng: -68.12 + i * 0.001,
        altitude: 3600 + i * 10,
        timestamp: Date.now() + i * 5000,
        accuracy: 5,
      });
    }
    const freeFinished = await FinishActivityUseCase(freeLive, {
      saveActivity: async () => {},
      saveLocalActivity: async () => {},
    });
    const freeGpx = ExportTrackFileUseCase(freeFinished.saved);
    const trkpts = (freeGpx.content.match(/<trkpt/g) ?? []).length;
    recordTest(
      "StartFreeRecordingUseCase + Finish + GPX genera ruta libre multipunto",
      freeReady.origin === "free" &&
        freeFinished.saved.status === "completed" &&
        freeFinished.saved.recordedPoints.length === 3 &&
        trkpts === 3,
      `status=${freeFinished.saved.status} pts=${freeFinished.saved.recordedPoints.length} trkpts=${trkpts}`,
    );
  } catch (e: any) {
    recordTest(
      "StartFreeRecordingUseCase + Finish + GPX genera ruta libre multipunto",
      false,
      e.message,
    );
  }

  // 15. isFreeRecording detecta grabación libre por origin o prefijo de ruta
  try {
    const freeReady = StartFreeRecordingUseCase({
      position: { lat: -16.5, lng: -68.12 },
      userId: "user-free-1",
      userName: "Caminante",
    });
    const legacyFree: LiveActivity = {
      ...freeReady,
      origin: undefined,
      route: { ...freeReady.route, routeId: "free-123" },
    };
    const routeLive: LiveActivity = {
      ...freeReady,
      origin: "route",
    };
    recordTest(
      "isFreeRecording detecta grabación libre por origin o prefijo de ruta",
      isFreeRecording(freeReady) === true &&
        isFreeRecording(legacyFree) === true &&
        isFreeRecording(routeLive) === false &&
        isFreeRecording(null) === false,
      "Detectado correctamente",
    );
  } catch (e: any) {
    recordTest(
      "isFreeRecording detecta grabación libre por origin o prefijo de ruta",
      false,
      e.message,
    );
  }

  // 16. Recuperación separada por flujo (libre/ruta/plan)
  try {
    const mk = (
      origin: "free" | "route" | "plan",
      phase: LiveActivity["phase"],
    ): LiveActivity => ({ ...baseLiveActivity, origin, phase });
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
  } catch (e: any) {
    recordTest(
      "Recuperación separada por flujo (libre/ruta/plan)",
      false,
      e.message,
    );
  }

  // 17. seedQualityCheck valida matriz de calidad: precisión y frescura
  try {
    const now = Date.now();
    const freshGood = seedQualityCheck(
      { lat: -16.5, lng: -68.1, accuracy: 10, fixTimestamp: now },
      now,
    );
    const stale = seedQualityCheck(
      {
        lat: -16.5,
        lng: -68.1,
        accuracy: 10,
        fixTimestamp: now - SEED_MAX_AGE_MS - 5000,
      },
      now,
    );
    const lowAcc = seedQualityCheck(
      { lat: -16.5, lng: -68.1, accuracy: 40, fixTimestamp: now },
      now,
    );
    const noTimestamp = seedQualityCheck(
      { lat: -16.5, lng: -68.1, accuracy: 10 },
      now,
    );

    recordTest(
      "seedQualityCheck valida matriz de calidad (frescura y precisión)",
      freshGood.ok === true &&
        stale.ok === false &&
        stale.reason === "stale" &&
        lowAcc.ok === false &&
        lowAcc.reason === "low_accuracy" &&
        noTimestamp.ok === true,
      `fresh=${freshGood.ok} stale=${!stale.ok} lowAcc=${!lowAcc.ok}`,
    );
  } catch (e: any) {
    recordTest(
      "seedQualityCheck valida matriz de calidad (frescura y precisión)",
      false,
      e.message,
    );
  }

  // 18. StartFreeRecording descarta semilla vieja o imprecisa evitando saltos iniciales
  try {
    const now = Date.now();
    const staleStart = StartFreeRecordingUseCase({
      position: {
        lat: -16.5,
        lng: -68.1,
        accuracy: 10,
        fixTimestamp: now - 60_000,
      },
      userId: "user-free-stale",
      userName: "Caminante",
    });
    const lowAccStart = StartFreeRecordingUseCase({
      position: { lat: -16.5, lng: -68.1, accuracy: 50, fixTimestamp: now },
      userId: "user-free-lowacc",
      userName: "Caminante",
    });
    const freshStart = StartFreeRecordingUseCase({
      position: { lat: -16.5, lng: -68.1, accuracy: 10, fixTimestamp: now },
      userId: "user-free-fresh",
      userName: "Caminante",
    });

    recordTest(
      "StartFreeRecording inicia sin guardar la posición inicial como punto",
      staleStart.recordedPoints.length === 0 &&
        lowAccStart.recordedPoints.length === 0 &&
        freshStart.recordedPoints.length === 0,
      `stale=${staleStart.recordedPoints.length} lowAcc=${lowAccStart.recordedPoints.length} fresh=${freshStart.recordedPoints.length}`,
    );
  } catch (e: any) {
    recordTest(
      "StartFreeRecording inicia sin guardar la posición inicial como punto",
      false,
      e.message,
    );
  }

  // Imprimir reporte
  let passedCount = 0;
  for (const r of results) {
    if (r.passed) {
      passedCount++;
      console.log(`[✓ PASS] [${r.id}] ${r.criterion}`);
      console.log(`        Detalle: ${r.detail}\n`);
    } else {
      console.log(`[✗ FAIL] [${r.id}] ${r.criterion}`);
      console.log(`        Detalle: ${r.detail}\n`);
    }
  }

  console.log("------------------------------------------------------------");
  console.log(
    `Total Pruebas: ${results.length} | Aprobadas: ${passedCount} | Fallidas: ${results.length - passedCount}`,
  );
  console.log("------------------------------------------------------------\n");

  if (passedCount !== results.length) {
    process.exit(1);
  } else {
    console.log("🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-08 PASARON AL 100%.\n");
  }
}

runTests().catch((err) => {
  console.error("Error ejecutando suite HU-08:", err);
  process.exit(1);
});
