import type { RouteModel } from '../../domain/types';
import type { RoutePlan } from '../../domain/plan';

/**
 * HU-07 T6 (recuperar) — Obtener un borrador por id y reconstruir RoutePlan.
 * Valida propiedad y restaura el estado de confirmación desde el autosave local.
 */

export interface GetDraftPorts {
  getDraft: (id: string) => Promise<RouteModel | null>;
  loadLocalPlan: () => Promise<RoutePlan | null>;
}

export async function GetDraftUseCase(
  args: { uid: string; id: string },
  ports: GetDraftPorts
): Promise<RoutePlan> {
  const local = await ports.loadLocalPlan();
  if (local?.id === args.id && local.creatorId === args.uid) return local;
  const route = await ports.getDraft(args.id);
  if (!route) {
    throw new Error('El borrador no existe o ya fue eliminado.');
  }
  if (route.creatorId !== args.uid) {
    throw new Error('No tienes permiso para abrir este borrador.');
  }

  return {
    id: route.id,
    creatorId: route.creatorId,
    creatorName: route.creatorName,
    title: route.title,
    status: 'planning',
    startPoint: toPlannedPoint(route.startPoint),
    endPoint: toPlannedPoint(route.endPoint),
    waypoints: route.waypoints,
    difficulty: route.difficulty,
    // El flag de confirmación es local: se conserva si coincide el mismo borrador.
    startPointConfirmed: local && local.id === route.id ? local.startPointConfirmed : false,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  };
}

function toPlannedPoint(
  point: { name?: string; lat: number; lng: number } | undefined
): RoutePlan['startPoint'] {
  if (!point) return null;
  return { lat: point.lat, lng: point.lng, name: point.name };
}
