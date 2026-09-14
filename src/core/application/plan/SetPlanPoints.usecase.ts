import { SetPlanPointsSchema } from '../../domain/plan.schemas';
import type { PlannedPoint, RoutePlan } from '../../domain/plan';

/**
 * HU-07 T2/T3 — Establecer punto inicial provisional y destino provisional.
 * Valida ambos puntos con SetPlanPointsSchema y persiste localmente (autosave).
 */

export interface SetPlanPointsPorts {
  saveLocalPlan: (plan: RoutePlan) => Promise<void>;
}

export async function SetPlanPointsUseCase(
  args: { plan: RoutePlan; start: PlannedPoint; end: PlannedPoint },
  ports: SetPlanPointsPorts
): Promise<RoutePlan> {
  const parsed = SetPlanPointsSchema.parse({ start: args.start, end: args.end });

  const updated: RoutePlan = {
    ...args.plan,
    startPoint: parsed.start,
    endPoint: parsed.end,
    updatedAt: Date.now(),
  };

  await ports.saveLocalPlan(updated);
  return updated;
}