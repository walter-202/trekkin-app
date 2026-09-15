import { TrekkinActivitySchema } from '../../domain/activity.schemas';
import type { Coordinates, RouteDifficulty, TrekkinActivity } from '../../domain/types';
import { calculateTrackDistanceKm, suggestRouteDifficulty } from '../../domain/calculations';

/**
 * HU-08 — Finalizar la actividad de grabación GPS.
 * Caso de uso puro con puertos inyectados.
 * Marca la actividad como 'completed', fija timestamp de finalización,
 * calcula métricas definitivas y sugiere nivel de dificultad.
 */

export interface FinishActivityPorts {
  saveActivity: (activity: TrekkinActivity) => Promise<void>;
  saveLocalActivity?: (activity: TrekkinActivity) => Promise<void>;
}

export async function FinishActivityUseCase(
  args: {
    activity: TrekkinActivity;
    durationSeconds?: number;
    elevationGainM?: number;
    finalPoint?: Coordinates;
  },
  ports: FinishActivityPorts
): Promise<{ activity: TrekkinActivity; suggestedDifficulty: RouteDifficulty }> {
  const { activity, elevationGainM, finalPoint } = args;
  const now = Date.now();

  const finalPoints = [...activity.recordedPoints];
  if (finalPoint) {
    const lastPoint = finalPoints.length > 0 ? finalPoints[finalPoints.length - 1] : null;
    if (!lastPoint || lastPoint.lat !== finalPoint.lat || lastPoint.lng !== finalPoint.lng) {
      finalPoints.push(finalPoint);
    }
  }

  const finalDistanceKm =
    finalPoints.length >= 2
      ? calculateTrackDistanceKm(finalPoints)
      : activity.distanceCoveredKm;

  const duration =
    args.durationSeconds !== undefined && args.durationSeconds >= 0
      ? args.durationSeconds
      : Math.max(0, Math.floor((now - activity.startedAt) / 1000));

  const completedActivity: TrekkinActivity = {
    ...activity,
    status: 'completed',
    finishedAt: now,
    distanceCoveredKm: finalDistanceKm,
    remainingDistanceKm: 0,
    durationSeconds: duration,
    recordedPoints: finalPoints,
  };

  TrekkinActivitySchema.parse(completedActivity);

  const suggestedDifficulty = suggestRouteDifficulty(finalDistanceKm, elevationGainM);

  // Persiste en base de datos remota (Firestore)
  await ports.saveActivity(completedActivity);

  if (ports.saveLocalActivity) {
    await ports.saveLocalActivity({ ...completedActivity, isSynced: true });
  }

  return {
    activity: { ...completedActivity, isSynced: true },
    suggestedDifficulty,
  };
}

