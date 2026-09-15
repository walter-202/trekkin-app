import type { LiveActivity } from "../../domain/activity";
import { canTransition } from "../../domain/activity";

/**
 * HU-06 — Pausar la actividad.
 * Detiene el registro activo y el tiempo. El tiempo transcurrido hasta la pausa
 * se acumula en accumulatedActiveMs (los minutos de pausa no cuentan como activos).
 */

export async function PauseActivityUseCase(
  activity: LiveActivity,
): Promise<LiveActivity> {
  if (!canTransition(activity.phase, "paused")) {
    throw new Error("No se puede pausar una actividad que no está en curso.");
  }
  const now = Date.now();
  const lastActiveFrom = activity.lastResumedAt ?? activity.startedAt ?? now;
  return {
    ...activity,
    phase: "paused",
    accumulatedActiveMs:
      activity.accumulatedActiveMs + Math.max(0, now - lastActiveFrom),
    lastResumedAt: null,
    updatedAt: now,
  };
}
