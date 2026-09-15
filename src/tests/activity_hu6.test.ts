/**
 * Automated Acceptance Test Suite: HU-06 (Realizar una ruta existente)
 * Clean Architecture — Dominio puro + Casos de Uso con puertos inyectados.
 *
 * Scope:
 * - Máquina de estados y umbrales configurables (ACTIVITY_CONFIG).
 * - Cálculos geográficos (haversine, filtrado GPS, distancia restante).
 * - StartActivity / BeginTracking / RecordPoint / Pause / Resume / Finish.
 * - Historial: ListActivities (orden) y GetActivity (ownership).
 * - Esquemas zod (RecordedPointSchema / FinishReasonSchema).
 */

import type { LiveActivity } from "../core/domain/activity";
import {
  ACTIVITY_CONFIG,
  activeElapsedMs,
  canTransition,
  toLiveRouteInfo,
  toTrekkinActivity,
} from "../core/domain/activity";
import {
  accumulatedDistanceKm,
  cleanTrack,
  distanceM,
  haversineKm,
  isNearM,
  remainingDistanceToEndKm,
} from "../core/domain/calculations";
import {
  FinishReasonSchema,
  RecordedPointSchema,
} from "../core/domain/activity.schemas";
import type { RouteModel, Coordinates } from "../core/domain/types";
import { StartActivityUseCase } from "../core/application/activity/StartActivity.usecase";
import { BeginTrackingUseCase } from "../core/application/activity/BeginTracking.usecase";
import { RecordPointUseCase } from "../core/application/activity/RecordPoint.usecase";
import { PauseActivityUseCase } from "../core/application/activity/PauseActivity.usecase";
import { ResumeActivityUseCase } from "../core/application/activity/ResumeActivity.usecase";
import { FinishActivityUseCase } from "../core/application/activity/FinishActivity.usecase";
import { ListActivitiesUseCase } from "../core/application/activity/ListActivities.usecase";
import { GetActivityUseCase } from "../core/application/activity/GetActivity.usecase";

interface TestResult {
  id: string;
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `HU-06-${results.length + 1}`,
    criterion,
    passed,
    detail,
  });
}

// ===========================================================================
// FIXTURES
// ===========================================================================

const routeFixture: RouteModel = {
  id: "route-1",
  title: "Chacaltaya Express",
  description: "Ruta de prueba para HU-06.",
  region: "La Paz",
  startPoint: { name: "Estacionamiento", lat: -16.35, lng: -68.13 },
  endPoint: { name: "Cima", lat: -16.3522, lng: -68.1278 },
  distanceKm: 0.3,
  durationMinutes: 90,
  difficulty: "moderado",
  modality: "acompañado",
  status: "published",
  isPrivate: false,
  creatorId: "route-owner",
  creatorName: "Guía Apaza",
  waypoints: [
    { lat: -16.35, lng: -68.13 },
    { lat: -16.351, lng: -68.129 },
    { lat: -16.352, lng: -68.128 },
    { lat: -16.3522, lng: -68.1278 },
  ],
  checkpoints: [
    {
      id: "cp-1",
      name: "Refugio",
      category: "refugio",
      lat: -16.351,
      lng: -68.129,
      createdAt: 1,
    },
  ],
  photos: [],
  createdAt: 1717000000000,
  updatedAt: 1717000000000,
};

async function startReadyActivity(): Promise<LiveActivity> {
  return StartActivityUseCase(
    { routeId: "route-1", userId: "user-123", userName: "Mateo Condori" },
    { getRoute: async () => routeFixture },
  );
}

function pointInput(p: Coordinates): {
  lat: number;
  lng: number;
  timestamp: number;
} {
  return { lat: p.lat, lng: p.lng, timestamp: Date.now() };
}

// ===========================================================================
// 1) MÁQUINA DE ESTADOS Y UMBRALES
// ===========================================================================

async function runActivityAcceptanceTests(): Promise<TestResult[]> {
  // Estado principal: transiciones válidas/inválidas.
  recordTest(
    "Ciclo de vida: ready→in_progress→paused→in_progress→finished permitido",
    canTransition("ready", "in_progress") &&
      canTransition("in_progress", "paused") &&
      canTransition("paused", "in_progress") &&
      canTransition("paused", "finished") &&
      canTransition("in_progress", "finished"),
    "Transiciones canónicas aceptadas por canTransition",
  );
  recordTest(
    "Transiciones inválidas rechazadas (pausar sin iniciar, reanudar sin pausar, modificar finalizada)",
    !canTransition("ready", "paused") &&
      !canTransition("in_progress", "in_progress") &&
      !canTransition("finished", "in_progress"),
    "canTransition bloquea ready→paused y finished→in_progress",
  );

  // activeElapsedMs excluye pausas.
  const pausedElapsed = activeElapsedMs({
    ...(await startReadyActivity()),
    phase: "paused",
    accumulatedActiveMs: 60000,
    lastResumedAt: Date.now() - 10000,
  });
  recordTest(
    "activeElapsedMs excluye el tiempo en pausa (no suma la sesión pausada)",
    pausedElapsed === 60000,
    `Pausado → ${pausedElapsed} ms`,
  );

  const activeElapsed = activeElapsedMs({
    ...(await startReadyActivity()),
    phase: "in_progress",
    accumulatedActiveMs: 1000,
    lastResumedAt: Date.now() - 5000,
  });
  recordTest(
    "activeElapsedMs suma la sesión en curso al tiempo acumulado",
    activeElapsed >= 5900 && activeElapsed <= 6300,
    `En curso → ${activeElapsed} ms`,
  );

  // ===========================================================================
  // 2) CÁLCULOS GEOGRÁFICOS
  // ===========================================================================

  const a: Coordinates = { lat: -16.5, lng: -68.15 };
  const b: Coordinates = { lat: -17.4, lng: -66.15 };
  const dKm = haversineKm(a, b);
  recordTest(
    "haversineKm devuelve una distancia geográfica razonable (La Paz→Cochabamba ≈ 240 km)",
    dKm > 200 && dKm < 280,
    `Distancia: ${dKm.toFixed(1)} km`,
  );
  recordTest(
    "distanceM es consistente con haversineKm (×1000) y simétrica",
    Math.abs(distanceM(a, b) - dKm * 1000) < 0.01 &&
      distanceM(a, b) === distanceM(b, a),
    `distanceM: ${distanceM(a, b).toFixed(1)} m`,
  );
  recordTest(
    "isNearM detecta proximidad dentro del radio (checkpoint visitado)",
    isNearM(
      { lat: -16.3510001, lng: -68.1290001 },
      routeFixture.checkpoints[0],
      120,
    ),
    "Punto a pocos metros del checkpoint → visitado",
  );

  // Filtrado GPS: ruido (puntos cercanos) y saltos grandes descartados.
  const noisyTrack: Coordinates[] = [
    { lat: -16.35, lng: -68.13 },
    { lat: -16.35000001, lng: -68.13 }, // ~1 mm, ruido
    { lat: -16.351, lng: -68.129 },
    { lat: -16.36, lng: -68.12 }, // salto grande (> 400 m)
    { lat: -16.352, lng: -68.128 },
  ];
  const cleaned = cleanTrack(noisyTrack, {
    minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
    maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
  });
  recordTest(
    "cleanTrack descarta ruido (puntos < 8 m) y saltos GPS (> 400 m)",
    cleaned.length === 3 &&
      cleaned[0].lat === -16.35 &&
      cleaned[cleaned.length - 1].lat === -16.352,
    `Puntos conservados: ${cleaned.length}`,
  );
  recordTest(
    "accumulatedDistanceKm acumula distancias y nunca es negativa",
    accumulatedDistanceKm(cleaned, {
      minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
      maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
    }) > 0,
    `Distancia acumulada: ${accumulatedDistanceKm(cleaned).toFixed(3)} km`,
  );

  const routePolyline = [...routeFixture.waypoints, routeFixture.endPoint];
  recordTest(
    "remainingDistanceToEndKm ≥ 0 en el inicio de la ruta",
    remainingDistanceToEndKm({ lat: -16.35, lng: -68.13 }, routePolyline) >= 0,
    `Restante al iniciar: ${remainingDistanceToEndKm(
      { lat: -16.35, lng: -68.13 },
      routePolyline,
    ).toFixed(3)} km`,
  );

  // ===========================================================================
  // 3) ESQUEMAS ZOD
  // ===========================================================================

  recordTest(
    "RecordedPointSchema acepta un punto GPS válido",
    RecordedPointSchema.safeParse({
      lat: -16.351,
      lng: -68.129,
      timestamp: Date.now(),
    }).success,
    "Punto válido aceptado",
  );
  recordTest(
    "RecordedPointSchema rechaza latitud fuera de rango y timestamp inválido",
    !RecordedPointSchema.safeParse({ lat: 95, lng: 0, timestamp: Date.now() })
      .success &&
      !RecordedPointSchema.safeParse({ lat: 0, lng: 0, timestamp: -5 }).success,
    "Latitud 95 y timestamp negativo rechazados",
  );
  recordTest(
    "FinishReasonSchema define las razones de finalización",
    FinishReasonSchema.safeParse("reached_end").success &&
      FinishReasonSchema.safeParse("user_stopped").success &&
      !FinishReasonSchema.safeParse("otra").success,
    "Enum reached_end|user_stopped",
  );

  // ===========================================================================
  // 4) CASOS DE USO
  // ===========================================================================

  // StartActivity: ruta publicada válida → activity 'ready' con snapshot.
  const readyActivity = await startReadyActivity();
  recordTest(
    "StartActivityUseCase prepara la actividad (phase ready) con snapshot de la ruta",
    readyActivity.phase === "ready" &&
      readyActivity.route.routeId === "route-1" &&
      readyActivity.recordedPoints.length === 0,
    `ID: ${readyActivity.id}`,
  );
  recordTest(
    "StartActivityUseCase rechaza una ruta no publicada o inexistente",
    await (async () => {
      try {
        await StartActivityUseCase(
          { routeId: "route-1", userId: "u", userName: "x" },
          {
            getRoute: async () => ({
              ...routeFixture,
              status: "draft" as const,
            }),
          },
        );
        return false;
      } catch {
        return true;
      }
    })(),
    "Ruta draft lanzó error",
  );
  recordTest(
    "toLiveRouteInfo crea un snapshot desacoplado (startPoint/endPoint copiados)",
    toLiveRouteInfo(routeFixture).startPoint.name ===
      routeFixture.startPoint.name &&
      toLiveRouteInfo(routeFixture).waypoints.length ===
        routeFixture.waypoints.length,
    "Snapshot de ruta construido",
  );

  // BeginTracking: ready → in_progress (única vez).
  const began = await BeginTrackingUseCase(readyActivity);
  recordTest(
    "BeginTrackingUseCase inicia el seguimiento (in_progress) y marca última reanudación",
    began.phase === "in_progress" &&
      began.startedAt != null &&
      began.lastResumedAt != null,
    `startedAt: ${began.startedAt}`,
  );
  recordTest(
    "BeginTrackingUseCase no permite iniciar dos veces",
    await (async () => {
      try {
        await BeginTrackingUseCase(began);
        return false;
      } catch {
        return true;
      }
    })(),
    "Segundo begin lanzó error",
  );

  // RecordPoint: filtra, marca checkpoints y rechaza puntos en pausa.
  const point1 = pointInput(routeFixture.waypoints[0]);
  const viaCheckpoint = pointInput(routeFixture.checkpoints[0]);
  const nearEnd = pointInput(routeFixture.endPoint);
  const traced1 = await RecordPointUseCase(began, point1);
  const traced2 = await RecordPointUseCase(traced1, point1); // duplicado → jitter (< 8 m)
  const traced3 = await RecordPointUseCase(traced2, viaCheckpoint);
  const traced = await RecordPointUseCase(traced3, nearEnd);
  recordTest(
    "RecordPointUseCase acumula puntos del recorrido y descarta jitter (duplicados < 8 m)",
    traced.recordedPoints.length === 3 &&
      traced.recordedPoints[1].lat === routeFixture.checkpoints[0].lat,
    `Puntos registrados: ${traced.recordedPoints.length}`,
  );
  recordTest(
    "RecordPointUseCase marca checkpoints visitados al pasar cerca",
    traced.completedCheckpoints.includes("cp-1"),
    `Visitados: ${traced.completedCheckpoints.join(", ")}`,
  );
  const pausedLive = await PauseActivityUseCase(began);
  recordTest(
    "RecordPointUseCase rechaza registrar puntos mientras la actividad está pausada",
    await (async () => {
      try {
        await RecordPointUseCase(pausedLive, nearEnd);
        return false;
      } catch (err) {
        return err instanceof Error && err.message.includes("no está en curso");
      }
    })(),
    "Punto en pausa → error",
  );

  // Pause / Resume.
  recordTest(
    "PauseActivityUseCase pausa (paused) y ResumeActivityUseCase reanuda (in_progress)",
    pausedLive.phase === "paused",
    `Fase: ${pausedLive.phase}`,
  );
  const resumed = await ResumeActivityUseCase(pausedLive);
  recordTest(
    "ResumeActivityUseCase devuelve la actividad a in_progress",
    resumed.phase === "in_progress" && resumed.lastResumedAt != null,
    `Fase: ${resumed.phase}`,
  );
  recordTest(
    "ResumeActivityUseCase no permite reanudar una actividad en curso",
    await (async () => {
      try {
        await ResumeActivityUseCase(resumed);
        return false;
      } catch {
        return true;
      }
    })(),
    "Resume sobre in_progress lanzó error",
  );

  // Finish: guarda local primero y determina COMPLETA al llegar al final.
  const order: string[] = [];
  const finished = await FinishActivityUseCase(traced, {
    saveLocalActivity: async () => {
      order.push("local");
    },
    saveActivity: async () => {
      order.push("remote");
    },
  });
  recordTest(
    "FinishActivityUseCase guarda primero en local y luego en Firestore (no perder recorrido)",
    order.join(",") === "local,remote",
    `Orden: ${order.join(" → ")}`,
  );
  recordTest(
    "Fin al alcanzar el punto final (radio 150 m) → actividad COMPLETA",
    finished.activity.phase === "finished" &&
      finished.activity.finalStatus === "completed" &&
      finished.saved.status === "completed",
    `Estado: ${finished.saved.status}`,
  );
  recordTest(
    "toTrekkinActivity expone métricas y distancia restante coherentes",
    finished.saved.distanceCoveredKm > 0 &&
      finished.saved.remainingDistanceKm >= 0 &&
      finished.saved.isSynced === true,
    `Recorrido: ${finished.saved.distanceCoveredKm} km · restante: ${finished.saved.remainingDistanceKm} km`,
  );

  // Finish: inicio temprano → INCOMPLETA.
  const earlyStop = await FinishActivityUseCase(
    await RecordPointUseCase(began, pointInput(routeFixture.waypoints[0])),
    {
      saveLocalActivity: async () => {},
      saveActivity: async () => {},
    },
  );
  recordTest(
    "Fin temprano sin alcanzar el final ni cobertura → INCOMPLETA",
    earlyStop.saved.status === "incomplete",
    `Estado: ${earlyStop.saved.status}`,
  );

  // Finish: cobertura ≥ 95 % de la distancia oficial → COMPLETA sin llegar al final.
  // Separación 0.002° (≈ 222 m): dentro del filtro GPS (8..400 m) y a >150 m del final.
  const longRoute: RouteModel = {
    ...routeFixture,
    distanceKm: 0.9,
    waypoints: Array.from({ length: 6 }, (_, i) => ({
      lat: -16.35 + i * 0.002,
      lng: -68.13,
    })),
  };
  const longLive = await StartActivityUseCase(
    { routeId: "route-1", userId: "user-123", userName: "x" },
    { getRoute: async () => longRoute },
  );
  let longStarted = await BeginTrackingUseCase(longLive);
  for (const w of longRoute.waypoints.slice(0, 5)) {
    longStarted = await RecordPointUseCase(longStarted, pointInput(w));
  }
  const coverageResult = await FinishActivityUseCase(longStarted, {
    saveLocalActivity: async () => {},
    saveActivity: async () => {},
  });
  recordTest(
    "Cobertura ≥ 95 % de la distancia oficial → COMPLETA (aunque no toque el final)",
    coverageResult.saved.status === "completed",
    `Distancia recorrida: ${coverageResult.saved.distanceCoveredKm} km · estado: ${coverageResult.saved.status}`,
  );

  // Historial: orden y propiedad.
  const listed = await ListActivitiesUseCase("user-123", {
    listByUser: async () => [
      { ...finished.saved, createdAt: 100 },
      { ...earlyStop.saved, createdAt: 300 },
    ],
  });
  recordTest(
    "ListActivitiesUseCase devuelve el historial ordenado por fecha (desc)",
    listed[0].createdAt === 300 && listed[1].createdAt === 100,
    `Orden: [${listed.map((l) => l.createdAt).join(", ")}]`,
  );
  const ownerOk =
    (
      await GetActivityUseCase(
        { id: finished.saved.id, userId: "user-123" },
        { get: async () => finished.saved },
      )
    )?.id === finished.saved.id;
  let intruderBlocked = false;
  try {
    await GetActivityUseCase(
      { id: finished.saved.id, userId: "otro" },
      { get: async () => finished.saved },
    );
  } catch {
    intruderBlocked = true;
  }
  recordTest(
    "GetActivityUseCase entrega la actividad solo a su dueño (ownership)",
    ownerOk && intruderBlocked,
    `Dueño: ${ownerOk} · intruso bloqueado: ${intruderBlocked}`,
  );

  return results;
}

if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("activity_hu6"))
) {
  console.log("\n============================================================");
  console.log("       TREKKIN APP — SUITE DE ACEPTACIÓN HU-06              ");
  console.log("============================================================\n");

  runActivityAcceptanceTests()
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
          "🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-06 PASARON AL 100%.\n",
        );
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Error fatal al ejecutar pruebas:", err);
      process.exit(1);
    });
}
