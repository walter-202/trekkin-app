import { CoordinatesSchema, TrekkinActivitySchema } from '../../domain/activity.schemas';
import type { Coordinates, TrekkinActivity } from '../../domain/types';
import { haversineDistanceKm } from '../../domain/calculations';

/**
 * HU-08 — Registrar una nueva coordenada GPS durante la grabación.
 * Caso de uso puro con puertos inyectados.
 * Acumula la distancia recorrida mediante Haversine y actualiza distancia restante.
 */

export interface RecordPointPorts {
  saveLocalActivity?: (activity: TrekkinActivity) => Promise<void>;
}

export async function RecordPointUseCase(
  args: {
    activity: TrekkinActivity;
    newPoint: Coordinates;
    destination?: { lat: number; lng: number };
  },
  ports?: RecordPointPorts
): Promise<TrekkinActivity> {
  const { activity, newPoint, destination } = args;

  // Solo se acumulan puntos si la actividad está en curso
  if (activity.status !== 'in_progress') {
    return activity;
  }

  const parsedPoint = CoordinatesSchema.parse(newPoint);
  const points = activity.recordedPoints;
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  let addedDistanceKm = 0;
  if (lastPoint) {
    addedDistanceKm = haversineDistanceKm(lastPoint, parsedPoint);
  }

  const newDistanceKm = Math.round((activity.distanceCoveredKm + addedDistanceKm) * 1000) / 1000;

  let remainingKm = activity.remainingDistanceKm;
  if (destination) {
    remainingKm = haversineDistanceKm(parsedPoint, destination);
  }

  const updated: TrekkinActivity = {
    ...activity,
    distanceCoveredKm: newDistanceKm,
    remainingDistanceKm: remainingKm,
    recordedPoints: [...points, parsedPoint],
  };

  TrekkinActivitySchema.parse(updated);

  if (ports?.saveLocalActivity) {
    await ports.saveLocalActivity(updated);
  }

  return updated;
}

