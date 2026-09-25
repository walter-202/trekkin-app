import type { LiveActivity, LiveRouteInfo } from "../../domain/activity";
import { ACTIVITY_CONFIG } from "../../domain/activity";
import { makeActivityId } from "./StartActivity.usecase";

export interface FreeRecordingPosition {
  lat: number;
  lng: number;
  altitude?: number;
  /** Precisión del fix GPS en metros. */
  accuracy?: number | null;
  /** Timestamp REAL del fix (ms). */
  fixTimestamp?: number | null;
}

/**
 * Edad máxima aceptada para el fix semilla (30 s). Por encima, el fix puede
 * provenir de caché del OS anterior al desplazamiento del usuario.
 */
export const SEED_MAX_AGE_MS = 30_000;

export type SeedQuality =
  { ok: true } | { ok: false; reason: "stale" | "low_accuracy" };

/**
 * Juzga si una posición inicial cumple criterio de precisión (MAX_ACCURACY_M)
 * y frescura temporal (SEED_MAX_AGE_MS) para intentar iniciar el flujo.
 */
export function seedQualityCheck(
  position: FreeRecordingPosition,
  now: number = Date.now(),
): SeedQuality {
  const timestamp = position.fixTimestamp ?? now;
  const age = now - timestamp;
  if (!Number.isFinite(age) || age < 0 || age > SEED_MAX_AGE_MS) {
    return { ok: false, reason: "stale" };
  }
  if (
    position.accuracy != null &&
    position.accuracy > ACTIVITY_CONFIG.MAX_ACCURACY_M
  ) {
    return { ok: false, reason: "low_accuracy" };
  }
  return { ok: true };
}

export interface StartFreeRecordingArgs {
  position: FreeRecordingPosition;
  userId: string;
  userName: string;
}

/**
 * HU-08 — Inicia una grabación libre desde la ubicación GPS actual.
 * NO exige ruta publicada (HU-06), plan, borrador ni destino: el punto
 * inicial se usa solo para arrancar el flujo y no se persiste como punto grabado.
 * `origin: "free"` identifica el flujo para la regla de finalización.
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

  const recordedPoints: LiveActivity["recordedPoints"] = [];

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
    recordedPoints,
    completedCheckpoints: [],
    newCheckpoints: [],
    createdAt: now,
    updatedAt: now,
  };
}
