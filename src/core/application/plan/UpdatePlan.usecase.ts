import type { RouteModel } from '../../domain/types';
import type { RoutePlan } from '../../domain/plan';

/**
 * HU-07 T7 — Modificar la planificación antes de iniciar la ruta.
 * Sincroniza los cambios del plan (puntos, título, dificultad) con el borrador
 * en Firestore y con el autosave local.
 */

export interface UpdatePlanPorts {
  updateDraft: (id: string, updates: Partial<RouteModel>) => Promise<void>;
  saveLocalPlan: (plan: RoutePlan) => Promise<void>;
}

export async function UpdatePlanUseCase(
  plan: RoutePlan,
  ports: UpdatePlanPorts
): Promise<RoutePlan> {
  const startPoint = plan.startPoint;
  const endPoint = plan.endPoint;

  if (!startPoint || !endPoint) {
    throw new Error('La planificación debe tener punto inicial y destino.');
  }

  const updated: RoutePlan = {
    ...plan,
    startPoint,
    endPoint,
    updatedAt: Date.now(),
  };

  if (updated.id && updated.startPoint && updated.endPoint) {
    await ports.updateDraft(updated.id, {
      title: updated.title,
      difficulty: updated.difficulty,
      startPoint: {
        name: updated.startPoint.name ?? 'Inicio provisional',
        lat: updated.startPoint.lat,
        lng: updated.startPoint.lng,
      },
      endPoint: {
        name: updated.endPoint.name ?? 'Destino provisional',
        lat: updated.endPoint.lat,
        lng: updated.endPoint.lng,
      },
      waypoints: updated.waypoints,
      updatedAt: updated.updatedAt,
    });
  }

  await ports.saveLocalPlan(updated);
  return updated;
}