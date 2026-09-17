import type { RoutePlan } from "../../domain/plan";
import type { Coordinates } from "../../domain/types";
import type { LiveActivity, LiveRouteInfo } from "../../domain/activity";
import { makeActivityId } from "./StartActivity.usecase";

export interface StartRecordingFromPlanArgs {
  plan: RoutePlan;
  userId: string;
  userName: string;
}

/**
 * HU-08 — Prepara una actividad en vivo a partir de un borrador planificado.
 * No exige ruta publicada (eso es HU-06). El GPS grabado es la ruta auténtica.
 */
export function StartRecordingFromPlanUseCase(
  args: StartRecordingFromPlanArgs,
): LiveActivity {
  const { plan, userId, userName } = args;
  if (!plan.startPoint || !plan.endPoint) {
    throw new Error("La planificación debe tener inicio y destino.");
  }
  if (!plan.startPointConfirmed) {
    throw new Error("Confirma el punto de inicio real antes de grabar.");
  }

  const start = plan.startPoint;
  const end = plan.endPoint;
  const waypoints: Coordinates[] = [
    { lat: start.lat, lng: start.lng },
    ...(plan.waypoints ?? []).filter(
      (p) =>
        !(p.lat === start.lat && p.lng === start.lng) &&
        !(p.lat === end.lat && p.lng === end.lng),
    ),
    { lat: end.lat, lng: end.lng },
  ];

  const route: LiveRouteInfo = {
    routeId: plan.id,
    routeTitle: plan.title.trim() || "Ruta grabada",
    startPoint: {
      name: start.name ?? "Inicio",
      lat: start.lat,
      lng: start.lng,
    },
    endPoint: {
      name: end.name ?? "Destino",
      lat: end.lat,
      lng: end.lng,
    },
    waypoints,
    checkpoints: [],
    /** 0 = grabación libre: al finalizar cuenta como ruta auténtica, no como guía. */
    distanceKm: 0,
    durationMinutes: 0,
    difficulty: plan.difficulty,
  };

  const now = Date.now();
  return {
    id: makeActivityId(),
    userId,
    userName,
    route,
    phase: "ready",
    startedAt: null,
    lastResumedAt: null,
    accumulatedActiveMs: 0,
    recordedPoints: [{ lat: start.lat, lng: start.lng, timestamp: now }],
    completedCheckpoints: [],
    newCheckpoints: [],
    createdAt: now,
    updatedAt: now,
  };
}
