import { StartActivitySchema, TrekkinActivitySchema } from '../../domain/activity.schemas';
import type { Coordinates, TrekkinActivity } from '../../domain/types';
import { haversineDistanceKm } from '../../domain/calculations';

/**
 * HU-08 — Iniciar la grabación de una actividad con GPS.
 * Caso de uso puro con puertos inyectados.
 * Inicializa la actividad con status 'in_progress', punto inicial y métricas en 0.
 */

export interface StartActivityInput {
  userId: string;
  userName: string;
  routeId?: string;
  routeTitle?: string;
  initialPosition?: Coordinates;
  destination?: { lat: number; lng: number };
}

export interface StartActivityPorts {
  saveLocalActivity?: (activity: TrekkinActivity) => Promise<void>;
}

export function makeActivityId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function StartActivityUseCase(
  input: StartActivityInput,
  ports?: StartActivityPorts
): Promise<TrekkinActivity> {
  const parsed = StartActivitySchema.parse(input);
  const now = Date.now();
  const id = makeActivityId();

  let remainingKm = 0;
  if (parsed.initialPosition && input.destination) {
    remainingKm = haversineDistanceKm(parsed.initialPosition, input.destination);
  }

  const activity: TrekkinActivity = {
    id,
    userId: parsed.userId,
    userName: parsed.userName ?? '',
    routeId: parsed.routeId ?? '',
    routeTitle: parsed.routeTitle ?? '',
    status: 'in_progress',
    startedAt: now,
    distanceCoveredKm: 0,
    remainingDistanceKm: remainingKm,
    durationSeconds: 0,
    recordedPoints: parsed.initialPosition ? [parsed.initialPosition] : [],
    completedCheckpoints: [],
    isSynced: false,
    createdAt: now,
  };

  TrekkinActivitySchema.parse(activity);

  if (ports?.saveLocalActivity) {
    await ports.saveLocalActivity(activity);
  }

  return activity;
}

