import type { LiveActivity } from "../../domain/activity";
import {
  ACTIVITY_CONFIG,
  canTransition,
  toTrekkinActivity,
} from "../../domain/activity";
import type {
  ActivityStatus,
  Coordinates,
  TrekkinActivity,
} from "../../domain/types";
import { isNearM } from "../../domain/calculations";

/**
 * HU-06 — Finalizar la actividad.
 * 1) Detiene el registro (transición → finished), 2) calcula distancia recorrida
 * (por trayecto, no directa) y tiempo activo (sin pausas), 3) determina
 * COMPLETA/INCOMPLETA con regla clara y configurable: se alcanzó el punto final
 * (radio de END_RADIUS_M) o se cubrió al menos COMPLETE_COVERAGE_RATIO de la
 * distancia oficial; si no, INCOMPLETA. 4) Guarda primero en autosave local y
 * luego en Firestore, para no perder el recorrido ante una falla de red.
 */

export interface FinishActivityPorts {
  saveActivity: (activity: TrekkinActivity) => Promise<void>;
  saveLocalActivity: (activity: LiveActivity) => Promise<void>;
}

export interface FinishActivityResult {
  activity: LiveActivity;
  saved: TrekkinActivity;
}

export async function FinishActivityUseCase(
  activity: LiveActivity,
  ports: FinishActivityPorts,
): Promise<FinishActivityResult> {
  if (!canTransition(activity.phase, "finished")) {
    throw new Error(
      "No se puede finalizar una actividad que no está en curso ni pausada.",
    );
  }

  const now = Date.now();
  const lastPoint = activity.recordedPoints[activity.recordedPoints.length - 1];
  const sessionMs =
    activity.phase === "in_progress" && activity.lastResumedAt != null
      ? Math.max(0, now - activity.lastResumedAt)
      : 0;
  const elapsedMs = activity.accumulatedActiveMs + sessionMs;

  // Regla clara: se alcanzó el final o se cubrió la mayor parte de la distancia oficial.
  const reachedEnd = lastPoint
    ? isNearM(lastPoint, activity.route.endPoint, ACTIVITY_CONFIG.END_RADIUS_M)
    : false;
  const distanceCoveredKm = toTrekkinActivity({
    ...activity,
    accumulatedActiveMs: elapsedMs,
  }).distanceCoveredKm;
  const nearFullCoverage =
    activity.route.distanceKm > 0 &&
    distanceCoveredKm >=
      activity.route.distanceKm * ACTIVITY_CONFIG.COMPLETE_COVERAGE_RATIO;
  const freeRecordingComplete =
    activity.origin === "free" && activity.recordedPoints.length >= 2;
  const finalStatus: ActivityStatus =
    freeRecordingComplete || reachedEnd || nearFullCoverage
      ? "completed"
      : "incomplete";

  const finished: LiveActivity = {
    ...activity,
    phase: "finished",
    accumulatedActiveMs: elapsedMs,
    lastResumedAt: null,
    finishedAt: now,
    finalStatus,
    updatedAt: now,
  };
  const saved = toTrekkinActivity(finished, { isSynced: true });

  // Prioridad: no perder recorrido. Local primero, Firestore después.
  await ports.saveLocalActivity(finished);
  await ports.saveActivity(saved);

  return { activity: finished, saved };
}
