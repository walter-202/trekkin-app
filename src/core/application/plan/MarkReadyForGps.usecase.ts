import type { RouteModel } from '../../domain/types';
import type { RoutePlan } from '../../domain/plan';

/**
 * HU-07 T10 — Preparar la ruta para iniciar su grabación GPS.
 * Exige punto de inicio confirmado y destino; marca el plan como
 * 'ready_for_gps' (handoff a HU-08). El status de Firestore se mantiene
 * como 'draft' (las reglas no permiten valores extra), solo se sincroniza updatedAt.
 */

export interface MarkReadyForGpsPorts {
  updateDraft: (id: string, updates: Partial<RouteModel>) => Promise<void>;
  saveLocalPlan: (plan: RoutePlan) => Promise<void>;
}

export async function MarkReadyForGpsUseCase(
  plan: RoutePlan,
  ports: MarkReadyForGpsPorts
): Promise<RoutePlan> {
  if (!plan.startPoint) {
    throw new Error('Falta el punto de inicio de la ruta.');
  }
  if (!plan.endPoint) {
    throw new Error('Falta el destino de la ruta.');
  }
  if (!plan.startPointConfirmed) {
    throw new Error('Debes confirmar el punto inicial real antes de preparar la grabación.');
  }

  const updated: RoutePlan = { ...plan, status: 'ready_for_gps', updatedAt: Date.now() };

  if (updated.id) {
    await ports.updateDraft(updated.id, { updatedAt: updated.updatedAt });
  }

  await ports.saveLocalPlan(updated);
  return updated;
}