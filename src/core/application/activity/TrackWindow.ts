import type { Coordinates } from "../../domain/types";
import type { LiveActivity } from "../../domain/activity";
import {
  classifyPointDiscard,
  type PointDiscardReason,
} from "./RecordPoint.usecase";
import type { RecordedPointInput } from "../../domain/activity.schemas";
import { haversineKm } from "../../domain/calculations";

/**
 * ETAPA 2 SQLite — Ventana en memoria y planificación de persistencia.
 * Funciones puras (testeables bajo `tsx`): deciden QUÉ persistir sin tocar
 * ningún almacenamiento. El store ejecuta el plan contra SQLite y Zustand.
 */

/** Puntos recientes a mantener en memoria; el historial vive en SQLite. */
export const TRACK_WINDOW_SIZE = 300;

export type PointPersistPlan =
  | { action: "insert"; reason: "accepted" }
  | { action: "skip"; reason: Exclude<PointDiscardReason, "accepted"> };

/**
 * Decide si un punto validado debe insertarse en SQLite.
 * NO filtra (eso lo hace `RecordPointUseCase` con las mismas reglas);
 * NO escribe en ningún lado. El `seq` lo resuelve el llamante con
 * `ensureTrackReady` (MAX+1, nunca COUNT por fix).
 */
export function resolvePointPersistence(
  live: LiveActivity,
  rawPoint: RecordedPointInput,
): PointPersistPlan {
  const verdict = classifyPointDiscard(live, rawPoint);
  if (verdict === "accepted") {
    return { action: "insert", reason: "accepted" };
  }
  return { action: "skip", reason: verdict };
}

/** Recorta un track a los últimos `limit` puntos (orden preservado). */
export function sliceWindow(
  points: Coordinates[],
  limit: number = TRACK_WINDOW_SIZE,
): Coordinates[] {
  if (points.length <= limit) return points;
  return points.slice(points.length - limit);
}

/**
 * Siguiente `seq` tras un `MAX(seq)` persistido (`0` si no hay puntos).
 * Nunca usa `COUNT(*)` por fix.
 */
export function nextSeqAfterMax(maxSeq: number | null): number {
  return (maxSeq ?? 0) + 1;
}

/** Distancia del segmento entre el último punto y el nuevo (km). */
export function segmentKm(
  last: { lat: number; lng: number },
  point: { lat: number; lng: number },
): number {
  return haversineKm(last, point);
}

/**
 * ETAPA 3 — Autosave reducido: todo el `LiveActivity` EXCEPTO el track.
 * SQLite es la fuente del track; AsyncStorage conserva solo estado/cabecera
 * (id, usuario, origin, route, phase, tiempos, checkpoints, totalDistanceKm).
 */
export function slimLiveForAutosave(live: LiveActivity): LiveActivity {
  return { ...live, recordedPoints: [] };
}

/**
 * ETAPA 3 — Reconstruye una sesión desde una cabecera de autosave.
 * - Cabecera con array (legacy): se devuelve tal cual (compatible).
 * - Cabecera slim: la ventana se carga con `loadWindow()` (SQLite).
 * NO toca ningún almacenamiento; el llamante decide persistir.
 */
export function restoreLiveFromHeader(
  header: LiveActivity,
  loadWindow: () => Coordinates[],
): LiveActivity {
  if (header.recordedPoints.length > 0) {
    return header;
  }
  return { ...header, recordedPoints: loadWindow() };
}
