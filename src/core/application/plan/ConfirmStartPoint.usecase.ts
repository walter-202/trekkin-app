import { ConfirmStartPointSchema } from '../../domain/plan.schemas';
import type { PlannedPoint, RoutePlan } from '../../domain/plan';
import type { RouteModel } from '../../domain/types';

/**
 * HU-07 T8/T9 — Confirmar o modificar el punto inicial real al llegar al lugar.
 * Actualiza startPoint en el borrador (Firestore) y marca startPointConfirmed
 * en el plan local (el flag no se persiste en Firestore por reglas HU-07).
 */

export interface ConfirmStartPointPorts {
  updateDraft: (id: string, updates: Partial<RouteModel>) => Promise<void>;
  saveLocalPlan: (plan: RoutePlan) => Promise<void>;
}

export async function ConfirmStartPointUseCase(
  args: { plan: RoutePlan; start: PlannedPoint },
  ports: ConfirmStartPointPorts
): Promise<RoutePlan> {
  const parsed = ConfirmStartPointSchema.parse({ start: args.start });

  const updated: RoutePlan = {
    ...args.plan,
    startPoint: parsed.start,
    startPointConfirmed: true,
    updatedAt: Date.now(),
  };

  if (updated.id) {
    await ports.updateDraft(updated.id, {
      startPoint: {
        name: parsed.start.name ?? 'Inicio confirmado',
        lat: parsed.start.lat,
        lng: parsed.start.lng,
      },
      updatedAt: updated.updatedAt,
    });
  }

  await ports.saveLocalPlan(updated);
  return updated;
}