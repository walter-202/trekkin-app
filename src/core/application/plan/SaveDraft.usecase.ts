import { SaveDraftSchema } from '../../domain/plan.schemas';
import type { RouteModel } from '../../domain/types';
import type { RoutePlan } from '../../domain/plan';

/**
 * HU-07 T4 — Guardar la planificación como borrador.
 * Convierte RoutePlan -> RouteModel{status:'draft'} y lo persiste en Firestore
 * (vía puerto) además de guardar el plan localmente (autosave T5).
 */

export interface SaveDraftPorts {
  saveDraft: (route: RouteModel) => Promise<void>;
  saveLocalPlan: (plan: RoutePlan) => Promise<void>;
}

export function makeDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function SaveDraftUseCase(
  args: { plan: RoutePlan; defaultTitle?: string },
  ports: SaveDraftPorts,
): Promise<RoutePlan> {
  const plan = args.plan;
  if (!plan.startPoint || !plan.endPoint) {
    throw new Error('Debes seleccionar un punto inicial y un destino antes de guardar.');
  }

  const title =
    plan.title.trim() === ''
      ? (args.defaultTitle?.trim() ?? 'Borrador sin título')
      : plan.title;

  const parsed = SaveDraftSchema.parse({
    title,
    difficulty: plan.difficulty,
    terrainType: plan.terrainType,
    notes: plan.notes ?? '',
    weather: plan.weather,
    start: plan.startPoint,
    end: plan.endPoint,
  });

  const id = plan.id || makeDraftId();
  const now = Date.now();

  const route: RouteModel = {
    id,
    title: parsed.title,
    description: parsed.notes || 'Planificación de nueva ruta (HU-07)',
    region: '',
    startPoint: {
      name: parsed.start.name ?? 'Inicio provisional',
      lat: parsed.start.lat,
      lng: parsed.start.lng,
    },
    endPoint: {
      name: parsed.end.name ?? 'Destino provisional',
      lat: parsed.end.lat,
      lng: parsed.end.lng,
    },
    distanceKm: 0,
    durationMinutes: 0,
    difficulty: parsed.difficulty,
    terrainType: parsed.terrainType,
    notes: parsed.notes,
    weather: parsed.weather,
    modality: 'solo',
    status: 'draft',
    isPrivate: true,
    creatorId: plan.creatorId,
    creatorName: plan.creatorName,
    waypoints: plan.waypoints,
    checkpoints: [],
    photos: [],
    createdAt: plan.createdAt || now,
    updatedAt: now,
  };

  await ports.saveDraft(route);

  const saved: RoutePlan = {
    ...plan,
    id,
    title: route.title,
    startPoint: { ...parsed.start },
    endPoint: { ...parsed.end },
    difficulty: parsed.difficulty,
    terrainType: parsed.terrainType,
    notes: parsed.notes,
    weather: parsed.weather,
    waypoints: route.waypoints,
    createdAt: route.createdAt,
    updatedAt: now,
  };

  await ports.saveLocalPlan(saved);
  return saved;
}