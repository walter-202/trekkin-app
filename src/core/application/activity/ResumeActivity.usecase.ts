import type { LiveActivity } from "../../domain/activity";
import { canTransition } from "../../domain/activity";

/**
 * HU-06 — Reanudar la actividad.
 * Solo válido desde PAUSADA. El GPS y el cronómetro continúan desde la posición actual.
 */

export async function ResumeActivityUseCase(
  activity: LiveActivity,
): Promise<LiveActivity> {
  if (
    activity.phase !== "paused" ||
    !canTransition(activity.phase, "in_progress")
  ) {
    throw new Error("No se puede reanudar una actividad que no está pausada.");
  }
  const now = Date.now();
  return {
    ...activity,
    phase: "in_progress",
    lastResumedAt: now,
    updatedAt: now,
  };
}
