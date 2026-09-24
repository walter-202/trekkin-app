import type { LiveActivity, LiveRouteInfo } from "../../domain/activity";
import { ACTIVITY_CONFIG } from "../../domain/activity";
import { makeActivityId } from "./StartActivity.usecase";

export interface FreeRecordingPosition {
  lat: number;
  lng: number;
  altitude?: number;
  /** Precisión del fix (m). Sin ella no se puede juzgar su calidad. */
  accuracy?: number | null;
  /** Timestamp REAL del fix (ms). Nunca sobrescribir con Date.now(). */
  fixTimestamp?: number | null;
}

/**
 * Edad máxima aceptada para el fix semilla (30 s): por encima, el fix puede
 * ser cacheado y anterior al desplazamiento del usuario al punto de inicio.
 * Constante local y ajustable; no existe configuración previa en el proyecto.
 */
export const SEED_MAX_AGE_MS = 30_000;

export type SeedQuality =
  { ok: true } | { ok: false; reason: "stale" | "low_accuracy" };

/**
 * Juzga si un fix sirve como semilla con el criterio de precisión YA
 * existente (`MAX_ACCURACY_M`) + frescura por timestamp real. Pura.
 */
export function seedQualityCheck(
  position: FreeRecordingPosition,
  now: number = Date.now(),
): SeedQuality {
  const age =
    position.fixTimestamp == null ? Infinity : now - position.fixTimestamp;
  if (!Number.isFinite(age) || age < 0 || age > SEED_MAX_AGE_MS) {
    return { ok: false, reason: "stale" };
  }
  if (
    position.accuracy == null ||
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

  // Semilla solo con fix de calidad: timestamp y accuracy REALES del fix.
  // Sin calidad suficiente NO se inventa semilla: el primer fix validado
  // del watcher será P1 (distancia parte de 0, sin salto artificial).
  // La accuracy se conserva en la semilla (intersección local, sin tocar
  // el tipo canónico `Coordinates`).
  type SeededPoint = import("../../domain/types").Coordinates & {
    accuracy?: number;
  };
  const quality = seedQualityCheck(position, now);
  const seeded: SeededPoint[] = quality.ok
    ? [
        {
          lat: position.lat,
          lng: position.lng,
          altitude: position.altitude,
          accuracy: position.accuracy ?? undefined,
          timestamp: position.fixTimestamp as number,
        },
      ]
    : [];
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
