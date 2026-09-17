import type {
  ActivityStatus,
  Checkpoint,
  Coordinates,
  RouteDifficulty,
  RouteModel,
  TrekkinActivity,
} from "./types";
import {
  accumulatedDistanceKm,
  remainingDistanceToEndKm,
} from "./calculations";

/**
 * Clean Architecture — Dominio Actividad (HU-06 "Realizar una ruta existente").
 * Tipos puros para una actividad personal de recorrido: máquina de estados,
 * umbrales configurables y métricas. Independiente de Firebase, React y mapas.
 */

export type ActivityPhase =
  "preparing" | "ready" | "in_progress" | "paused" | "finished";

/** Resumen inmutable de la ruta publicada que se está realizando. */
export interface LiveRouteInfo {
  routeId: string;
  routeTitle: string;
  description?: string;
  photos?: string[];
  startPoint: { name: string; lat: number; lng: number };
  endPoint: { name: string; lat: number; lng: number };
  waypoints: Coordinates[];
  checkpoints: Checkpoint[];
  distanceKm: number;
  durationMinutes: number;
  difficulty: RouteDifficulty;
}

/**
 * Estado en vivo de la actividad durante la sesión (persistido en autosave local
 * `trekking_activity_autosave`). Se vuelca a Firestore al finalizar
 * (colección `activities`, reglas ya existentes).
 */
export interface LiveActivity {
  id: string;
  userId: string;
  userName: string;
  route: LiveRouteInfo;
  phase: ActivityPhase;
  startedAt: number | null;
  lastResumedAt: number | null;
  /** Tiempo activo acumulado, excluyendo pausas. */
  accumulatedActiveMs: number;
  recordedPoints: Coordinates[];
  completedCheckpoints: string[];
  /** Paradas agregadas en vivo por el usuario durante la actividad (HU-08). */
  newCheckpoints?: Checkpoint[];
  finishedAt?: number;
  finalStatus?: ActivityStatus;
  createdAt: number;
  updatedAt: number;
}

/** Umbrales configurables para la determinación de estado y filtrado GPS. */
export const ACTIVITY_CONFIG = {
  /** Radio para considerar la actividad COMPLETA al llegar al punto final. */
  END_RADIUS_M: 150,
  /** Radio para marcar un checkpoint como visitado. */
  CHECKPOINT_RADIUS_M: 120,
  /** Mínimo desplazamiento entre puntos para acumular distancia (evita jitter). */
  MIN_GPS_DELTA_M: 8,
  /** Desplazamiento máximo razonable entre puntos (salto mayor = error GPS). */
  MAX_GPS_JUMP_M: 400,
  /** Precisión GPS máxima aceptable (m) — HEU-08 A: descartar accuracy > 25 m. */
  MAX_ACCURACY_M: 25,
  /** Cobertura mínima sobre la distancia oficial para considerar COMPLETA. */
  COMPLETE_COVERAGE_RATIO: 0.95,
} as const;

/**
 * Máquina de estados de la actividad. No permite transiciones inválidas:
 * no pausar sin iniciar, no reanudar sin pausar, no iniciar dos veces,
 * no registrar puntos tras finalizar, no modificar una actividad finalizada.
 */
const TRANSITIONS: Record<ActivityPhase, ActivityPhase[]> = {
  preparing: ["ready"],
  ready: ["in_progress"],
  in_progress: ["paused", "finished"],
  paused: ["in_progress", "finished"],
  finished: [],
};

export function canTransition(from: ActivityPhase, to: ActivityPhase): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Tiempo activo actual (milisegundos), excluyendo pausas. */
export function activeElapsedMs(activity: LiveActivity): number {
  const base = activity.accumulatedActiveMs;
  if (activity.phase === "in_progress" && activity.lastResumedAt != null) {
    return base + Math.max(0, Date.now() - activity.lastResumedAt);
  }
  return base;
}

/** Snapshot de la ruta publicada que se está recorriendo (evita modificar el catálogo). */
export function toLiveRouteInfo(route: RouteModel): LiveRouteInfo {
  return {
    routeId: route.id,
    routeTitle: route.title,
    description: route.description ?? undefined,
    photos: route.photos ?? [],
    startPoint: route.startPoint ?? { name: "Punto inicial", lat: 0, lng: 0 },
    endPoint: route.endPoint ?? { name: "Punto final", lat: 0, lng: 0 },
    waypoints: route.waypoints ?? [],
    checkpoints: route.checkpoints ?? [],
    distanceKm: route.distanceKm ?? 0,
    durationMinutes: route.durationMinutes ?? 0,
    difficulty: route.difficulty,
  };
}

function roundKm(value: number): number {
  const f = 1000;
  return Math.round(value * f) / f;
}

/**
 * Convierte una actividad finalizada en el modelo persistible `TrekkinActivity`
 * (colección `activities`). Reutilizado por el use case de finalización y por el
 * store para conservar localmente la actividad si falla el guardado en Firestore.
 */
export function toTrekkinActivity(
  activity: LiveActivity,
  options: { isSynced?: boolean } = {},
): TrekkinActivity {
  const endPoint = activity.route.endPoint;
  const routePolyline: Coordinates[] = [...activity.route.waypoints, endPoint];
  const lastPoint = activity.recordedPoints[activity.recordedPoints.length - 1];
  const distanceCoveredKm = accumulatedDistanceKm(activity.recordedPoints, {
    minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
    maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
  });
  const remainingKm = lastPoint
    ? remainingDistanceToEndKm(lastPoint, routePolyline)
    : activity.route.distanceKm;

  return {
    id: activity.id,
    userId: activity.userId,
    userName: activity.userName,
    routeId: activity.route.routeId,
    routeTitle: activity.route.routeTitle,
    status: activity.finalStatus ?? "incomplete",
    startedAt: activity.startedAt ?? activity.createdAt,
    finishedAt: activity.finishedAt ?? activity.updatedAt,
    distanceCoveredKm: roundKm(distanceCoveredKm),
    remainingDistanceKm: roundKm(remainingKm),
    durationSeconds: Math.round(activity.accumulatedActiveMs / 1000),
    recordedPoints: activity.recordedPoints,
    completedCheckpoints: activity.completedCheckpoints,
    isSynced: options.isSynced ?? true,
    createdAt: activity.startedAt ?? activity.createdAt,
  };
}
