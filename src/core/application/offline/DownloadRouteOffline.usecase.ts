/**
 * HU-04 T6–T9 — Descargar ruta para consulta offline.
 * Orquesta la descarga en 3 etapas con progreso real (T10):
 *   1. map  → snapshot del mapa vectorial (T6)
 *   2. trail → trazado: waypoints + puntos relevantes (T7)
 *   3. info → información básica de la ruta (T8)
 * Cada etapa persiste su pieza vía puerto; `finalize` ensambla el
 * registro completo y marca la ruta como disponible offline (T9/T11).
 * Sin Firebase ni AsyncStorage aquí: solo puertos inyectados.
 */

import type { RouteModel } from "../../domain/types";
import {
  buildBasicOfflineInfo,
  buildMapSnapshot,
  DOWNLOAD_STAGES,
  estimateRouteOfflineSize,
  type OfflineRoute,
  type OfflineDownloadStage,
} from "../../domain/offline";
import { OfflineRouteSchema } from "../../domain/offline.schemas";

export type DownloadStageCallback = (stage: OfflineDownloadStage) => void;

export interface DownloadRouteOfflinePorts {
  saveMap: (routeId: string, payload: string) => Promise<void>;
  saveTrail: (routeId: string, payload: string) => Promise<void>;
  saveInfo: (routeId: string, payload: string) => Promise<void>;
  finalize: (routeId: string, record: OfflineRoute) => Promise<void>;
}

export interface DownloadRouteOfflineOptions {
  /** Progreso por etapa (T10). Se invoca antes de persistir cada pieza. */
  onStage?: DownloadStageCallback;
  /** Timestamp de descarga (testeable); por defecto Date.now(). */
  downloadedAt?: number;
}

function toMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export async function DownloadRouteOfflineUseCase(
  route: RouteModel,
  ports: DownloadRouteOfflinePorts,
  options: DownloadRouteOfflineOptions = {},
): Promise<OfflineRoute> {
  // Invariante HU-03 + HU-04: solo rutas publicadas se descargan.
  if (route.status !== "published") {
    throw new Error("Solo se pueden descargar rutas publicadas.");
  }

  const onStage = options.onStage ?? (() => {});
  const downloadedAt = options.downloadedAt ?? Date.now();
  const routeId = route.id;

  // T6 — Mapa vectorial (bbox + conteos del trazado).
  onStage("map");
  await ports.saveMap(routeId, JSON.stringify(buildMapSnapshot(route)));

  // T7 — Trazado: waypoints + checkpoints + puntos inicio/fin.
  onStage("trail");
  await ports.saveTrail(
    routeId,
    JSON.stringify({
      waypoints: route.waypoints,
      checkpoints: route.checkpoints,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
    }),
  );

  // T8 — Información básica persistida.
  onStage("info");
  await ports.saveInfo(
    routeId,
    JSON.stringify(buildBasicOfflineInfo(route)),
  );

  const estimate = estimateRouteOfflineSize(route);
  const record: OfflineRoute = {
    routeId,
    ...buildBasicOfflineInfo(route),
    map: buildMapSnapshot(route),
    trail: route.waypoints,
    checkpoints: route.checkpoints,
    photoUrls: route.photos,
    estimatedSizeMB: toMB(estimate.totalBytes),
    downloadedAt,
  };

  // Integridad: el registro se valida con Zod antes de persistir (T9).
  const validated = OfflineRouteSchema.parse(record);
  await ports.finalize(routeId, validated);
  return validated;
}

/** Etapas de descarga en orden (para UI de progreso T10). */
export const DOWNLOAD_STAGE_LABELS: Record<OfflineDownloadStage, string> = {
  map: "Descargando mapa…",
  trail: "Descargando trazado…",
  info: "Guardando información…",
};

export { DOWNLOAD_STAGES };