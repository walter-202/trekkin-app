import type { LiveActivity } from "../../domain/activity";
import { ACTIVITY_CONFIG } from "../../domain/activity";
import { distanceM, isNearM } from "../../domain/calculations";
import {
  RecordedPointSchema,
  type RecordedPointInput,
} from "../../domain/activity.schemas";

/**
 * HU-06 — Registrar un punto GPS del recorrido.
 * Solo se registran puntos cuando la actividad está EN_CURSO (no en pausa ni
 * finalizada). Se descartan puntos demasiado cercanos (jitter) y saltos grandes
 * (errores GPS); los checkpoints cercanos se marcan como visitados.
 */

export async function RecordPointUseCase(
  activity: LiveActivity,
  rawPoint: RecordedPointInput,
): Promise<LiveActivity> {
  if (activity.phase !== "in_progress") {
    throw new Error(
      "La actividad no está en curso. Reanúdala para continuar el registro.",
    );
  }

  const parsed = RecordedPointSchema.safeParse(rawPoint);
  if (!parsed.success) {
    throw new Error("Punto de ubicación inválido.");
  }
  const point = parsed.data;

  if (
    point.accuracy != null &&
    point.accuracy > ACTIVITY_CONFIG.MAX_ACCURACY_M
  ) {
    return { ...activity, updatedAt: Date.now() };
  }

  const completedCheckpoints = [...activity.completedCheckpoints];
  for (const cp of activity.route.checkpoints) {
    if (completedCheckpoints.includes(cp.id)) continue;
    if (isNearM(point, cp, ACTIVITY_CONFIG.CHECKPOINT_RADIUS_M)) {
      completedCheckpoints.push(cp.id);
    }
  }

  let recordedPoints = activity.recordedPoints;
  if (recordedPoints.length === 0) {
    recordedPoints = [point];
  } else {
    const last = recordedPoints[recordedPoints.length - 1];
    const d = distanceM(last, point);
    if (
      d >= ACTIVITY_CONFIG.MIN_GPS_DELTA_M &&
      d <= ACTIVITY_CONFIG.MAX_GPS_JUMP_M
    ) {
      recordedPoints = [...recordedPoints, point];
    }
  }

  return {
    ...activity,
    recordedPoints,
    completedCheckpoints,
    updatedAt: Date.now(),
  };
}
