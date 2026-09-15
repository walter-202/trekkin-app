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
  console.log("       TREKKIN APP — SUITE DE ACEPTACIÓN HU-08 (GRABACIÓN GPS) ");
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
    recordTest("CheckpointCategorySchema acepta categorías válidas", false, e.message);
  }

  // 2. Rechazo de categoría inválida
  try {
    CheckpointCategorySchema.parse("categoria_falsa");
    recordTest("CheckpointCategorySchema rechaza categoría inválida", false, "Debería fallar");
  } catch (e: any) {
    recordTest("CheckpointCategorySchema rechaza categoría inválida", true, "Rechazada correctamente");
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
    recordTest("CreateCheckpointSchema valida parada correcta", false, e.message);
  }

  // 4. Rechazo de parada sin nombre
  try {
    CreateCheckpointSchema.parse({
      name: "   ",
      category: "camping",
      lat: -16.5,
      lng: -68.1,
    });
    recordTest("CreateCheckpointSchema rechaza parada con nombre vacío", false, "Debería fallar");
  } catch (e: any) {
    recordTest("CreateCheckpointSchema rechaza parada con nombre vacío", true, "Rechazada: nombre obligatorio");
  }

  // 5. Rechazo de parada con coordenadas fuera de rango
  try {
    CreateCheckpointSchema.parse({
      name: "Mirador del cóndor",
      category: "vista",
      lat: 95.0,
      lng: -68.1,
    });
    recordTest("CreateCheckpointSchema rechaza latitud > 90", false, "Debería fallar");
  } catch (e: any) {
    recordTest("CreateCheckpointSchema rechaza latitud > 90", true, "Latitud 95 rechazada");
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

    const hasNew = res.activity.newCheckpoints?.some((c) => c.name === "Cueva de descanso");
    const hasCompletedId = res.activity.completedCheckpoints.includes(res.checkpoint.id);

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
    recordTest("TrekkinActivitySchema valida documento completo", false, e.message);
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
  console.log(`Total Pruebas: ${results.length} | Aprobadas: ${passedCount} | Fallidas: ${results.length - passedCount}`);
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
