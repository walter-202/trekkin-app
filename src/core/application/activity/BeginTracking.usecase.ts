import type { LiveActivity } from "../../domain/activity";
import { canTransition } from "../../domain/activity";

/**
 * HU-06 — Iniciar la actividad ("Iniciar actividad").
 * Transición válida: ready → in_progress. No se permite iniciar dos veces.
 */

export async function BeginTrackingUseCase(
  activity: LiveActivity,
): Promise<LiveActivity> {
  if (!canTransition(activity.phase, "in_progress")) {
    throw new Error(
      "La actividad ya está iniciada o no puede iniciarse en este estado.",
    );
  }
  const now = Date.now();
  return {
    ...activity,
    phase: "in_progress",
    startedAt: now,
    lastResumedAt: now,
    accumulatedActiveMs: 0,
    updatedAt: now,
  };
}
