import type { LiveActivity, LiveRouteInfo } from "../../domain/activity";
import { makeActivityId } from "./StartActivity.usecase";

export interface FreeRecordingPosition {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface StartFreeRecordingArgs {
  position: FreeRecordingPosition;
  userId: string;
  userName: string;
}

/**
 * HU-08 — Inicia una grabación libre desde la ubicación GPS actual.
 * NO exige ruta publicada (HU-06), plan, borrador ni destino: el punto
 * inicial proviene del GPS del teléfono, no del mapa.
 * `distanceKm: 0` marca grabación libre para que al finalizar cuente como
 * ruta auténtica (regla `freeRecordingComplete` de FinishActivity).
 */
export function StartFreeRecordingUseCase(
  args: StartFreeRecordingArgs,
): LiveActivity {
  const { position, userId, userName } = args;
  if (
    !Number.isFinite(position.lat) ||
    position.lat < -90 ||
    position.lat > 90 ||
    !Number.isFinite(position.lng) ||
    position.lng < -180 ||
    position.lng > 180
  ) {
    throw new Error("Ubicación GPS inválida para iniciar la grabación.");
  }
  if (!userId || !userId.trim()) {
    throw new Error("Usuario no autenticado.");
  }

  const now = Date.now();
  const route: LiveRouteInfo = {
    routeId: `free-${now}`,
    routeTitle: `Ruta grabada ${new Date(now).toLocaleDateString("es-BO")}`,
    startPoint: {
      name: "Punto inicial GPS",
      lat: position.lat,
      lng: position.lng,
    },
    endPoint: {
      name: "Punto final GPS",
      lat: position.lat,
      lng: position.lng,
    },
    waypoints: [],
    checkpoints: [],
    distanceKm: 0,
    durationMinutes: 0,
    difficulty: "facil",
  };

  return {
    id: makeActivityId(),
    userId,
    userName,
    origin: "free",
    route,
    phase: "ready",
    startedAt: null,
    lastResumedAt: null,
    accumulatedActiveMs: 0,
    recordedPoints: [
      {
        lat: position.lat,
        lng: position.lng,
        altitude: position.altitude,
        timestamp: now,
      },
    ],
    completedCheckpoints: [],
    newCheckpoints: [],
    createdAt: now,
    updatedAt: now,
  };
}
