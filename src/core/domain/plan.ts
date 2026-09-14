import type { Coordinates, RouteDifficulty } from './types';

/**
 * Clean Architecture — Dominio Planificación (HU-07).
 * Tipos puros para el estado de una ruta en planificación (borrador).
 * Independientes de Firebase, React y librerías de mapas.
 */

export type PlanStatus = 'planning' | 'ready_for_gps';

export interface PlannedPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RoutePlan {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  status: PlanStatus;
  startPoint: PlannedPoint | null;
  endPoint: PlannedPoint | null;
  waypoints: Coordinates[];
  difficulty: RouteDifficulty;
  startPointConfirmed: boolean;
  createdAt: number;
  updatedAt: number;
}