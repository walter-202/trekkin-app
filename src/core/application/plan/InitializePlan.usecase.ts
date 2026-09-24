import type { RoutePlan } from '../../domain/plan';

/**
 * HU-07 T1 — Inicializar el estado de planificación.
 * Carga el plan guardado localmente (autosave) o crea uno nuevo si no existe.
 * No toca Firestore (solo AsyncStorage a través de puertos).
 */

export interface InitializePlanPorts {
  loadLocalPlan: () => Promise<RoutePlan | null>;
}

export async function InitializePlanUseCase(
  args: { uid: string; creatorName: string; forceNew?: boolean },
  ports: InitializePlanPorts
): Promise<RoutePlan> {
  if (!args.forceNew) {
    const local = await ports.loadLocalPlan();
    if (local && local.creatorId === args.uid) {
      return local;
    }
  }
  const now = Date.now();
  return {
    id: '',
    creatorId: args.uid,
    creatorName: args.creatorName,
    title: '',
    status: 'planning',
    startPoint: null,
    endPoint: null,
    waypoints: [],
    difficulty: 'moderado',
    startPointConfirmed: false,
    createdAt: now,
    updatedAt: now,
  };
}
