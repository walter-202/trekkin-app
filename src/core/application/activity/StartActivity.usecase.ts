import type { RouteModel } from "../../domain/types";
import type { LiveActivity } from "../../domain/activity";
import { toLiveRouteInfo } from "../../domain/activity";

/**
 * HU-06 — Seleccionar y preparar una ruta publicada para realizar el recorrido.
 * Valida que la ruta exista, esté publicada y tenga un trazado usable antes de
 * permitir continuar. No persiste nada todavía (la actividad se guarda al finalizar).
 */

export interface StartActivityPorts {
  getRoute: (id: string) => Promise<RouteModel | null>;
}

export function makeActivityId(): string {
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface StartActivityArgs {
  routeId: string;
  userId: string;
  userName: string;
}

export async function StartActivityUseCase(
  args: StartActivityArgs,
  ports: StartActivityPorts,
): Promise<LiveActivity> {
  const route = await ports.getRoute(args.routeId);
  if (!route || route.status !== "published") {
    throw new Error("Esta ruta ya no está disponible.");
  }

  const hasValidTrace =
    route.startPoint &&
    route.endPoint &&
    Array.isArray(route.waypoints) &&
    route.waypoints.length >= 2;
  if (!hasValidTrace) {
    throw new Error(
      "La ruta no tiene un trazado válido para realizar el recorrido.",
    );
  }

  const now = Date.now();
  const activity: LiveActivity = {
    id: makeActivityId(),
    userId: args.userId,
    userName: args.userName,
    origin: "route",
    route: toLiveRouteInfo(route),
    phase: "ready",
    startedAt: null,
    lastResumedAt: null,
    accumulatedActiveMs: 0,
    recordedPoints: [],
    completedCheckpoints: [],
    createdAt: now,
    updatedAt: now,
  };
  return activity;
}
