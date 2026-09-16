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

/** Entrada de historial para undo — snapshot del plan antes de una modificación. */
export interface PlanHistoryEntry {
  snapshot: Pick<RoutePlan, 'startPoint' | 'endPoint' | 'waypoints'>;
  timestamp: number;
}

/** Máximo de entradas de historial para undo (evita consumo excesivo de memoria). */
export const MAX_UNDO_HISTORY = 10;

/** Índice inválido para indicar "agregar al final". */
export const APPEND_INDEX = -1;