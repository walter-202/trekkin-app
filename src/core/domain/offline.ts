/**
 * HU-04 Descarga offline — Dominio puro (sin RN/Expo/Firebase).
 * Entidades para descargar una ruta publicada y consultarla sin red:
 * información básica + trazado (waypoints + checkpoints) + mapa vectorial.
 * Los cálculos de tamaño estimado viven aquí (T3): funciones puras,
 * deterministas, sin I/O; la UI solo formatea el resultado.
 */

import type {
  Checkpoint,
  Coordinates,
  RouteDifficulty,
  RouteModality,
  RouteModel,
} from "./types";

/** Etapas de descarga de una ruta (T6–T8). Orden de progreso (T10). */
export type OfflineDownloadStage = "map" | "trail" | "info";

export const DOWNLOAD_STAGES: readonly OfflineDownloadStage[] = [
  "map",
  "trail",
  "info",
];

/** Desglose del tamaño estimado (T3/T4) en bytes por componente. */
export interface OfflineSizeEstimate {
  mapBytes: number;
  trailBytes: number;
  infoBytes: number;
  totalBytes: number;
}

/** Mapa vectorial descargado: geometría proyectable + bbox para el render. */
export interface OfflineMapSnapshot {
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  trailPointCount: number;
  checkpointCount: number;
}

/** Registro persistido en el dispositivo de una ruta descargada (T9). */
export interface OfflineRoute {
  routeId: string;
  title: string;
  region: string;
  description: string;
  startPoint: { name: string; lat: number; lng: number };
  endPoint: { name: string; lat: number; lng: number };
  distanceKm: number;
  durationMinutes: number;
  elevationGainM?: number;
  difficulty: RouteDifficulty;
  modality: RouteModality;
  creatorName: string;
  /** Mapa vectorial descargado (T6): bbox del trazado + conteos. */
  map: OfflineMapSnapshot;
  /** Trazado completo descargado (T7): waypoints + puntos relevantes. */
  trail: Coordinates[];
  checkpoints: Checkpoint[];
  /** Referencias a fotos remotas (T8: no se descargan, solo URLs). */
  photoUrls: string[];
  estimatedSizeMB: number;
  downloadedAt: number;
}

/** Formato legible de un tamaño en bytes (KB/MB, 1 decimal). */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Aproximación en bytes del JSON serializado de una pieza (ASCII→1 byte/car). */
function jsonBytes(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

function trailingCoordinatesBytes(waypoints: Coordinates[]): number {
  return jsonBytes(waypoints);
}

function checkpointsBytes(checkpoints: Checkpoint[]): number {
  return jsonBytes(checkpoints);
}

function basicInfoBytes(route: RouteModel): number {
  const info = {
    title: route.title,
    region: route.region,
    description: route.description,
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    elevationGainM: route.elevationGainM,
    difficulty: route.difficulty,
    modality: route.modality,
    creatorName: route.creatorName,
  };
  return jsonBytes(info);
}

/**
 * Costo del mapa vectorial descargado (T6). En esta v1 el "mapa" es el
 * snapshot vectorial de la geometría (SVG) proyectado sobre un bbox:
 * overhead fijo del render + bbox + retícula, proporcional al área cubierta.
 */
function mapBytes(route: RouteModel): number {
  const lats = route.waypoints.map((w) => w.lat);
  const lngs = route.waypoints.map((w) => w.lng);
  const area = Math.max(1, Math.abs(Math.max(...lats) - Math.min(...lats))) *
    Math.max(1, Math.abs(Math.max(...lngs) - Math.min(...lngs)));
  return Math.round(4096 + area * 5120);
}

/** T3 — Cálculo del tamaño estimado de la descarga (mapa + trazado + info). */
export function estimateRouteOfflineSize(route: RouteModel): OfflineSizeEstimate {
  const infoBytesValue = basicInfoBytes(route);
  const trailBytesValue = trailingCoordinatesBytes(route.waypoints) +
    checkpointsBytes(route.checkpoints);
  const mapBytesValue = mapBytes(route);
  return {
    mapBytes: mapBytesValue,
    trailBytes: trailBytesValue,
    infoBytes: infoBytesValue,
    totalBytes: mapBytesValue + trailBytesValue + infoBytesValue,
  };
}

/** Construye el bbox del trazado (fallback a puntos inicio/fin). */
export function trajectoryBounds(route: RouteModel): OfflineMapSnapshot["bounds"] {
  const pts: Coordinates[] = route.waypoints.length > 0 ? route.waypoints : [
    { lat: route.startPoint.lat, lng: route.startPoint.lng },
    { lat: route.endPoint.lat, lng: route.endPoint.lng },
  ];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.02;
  return {
    minLat: minLat - pad,
    maxLat: maxLat + pad,
    minLng: minLng - pad,
    maxLng: maxLng + pad,
  };
}

/** Snapshot del mapa vectorial descargado (T6) a partir de una ruta. */
export function buildMapSnapshot(route: RouteModel): OfflineMapSnapshot {
  return {
    bounds: trajectoryBounds(route),
    trailPointCount: route.waypoints.length,
    checkpointCount: route.checkpoints.length,
  };
}

/** T8 — Información básica persistida: nombre, distancia, dificultad, duración, etc. */
export function buildBasicOfflineInfo(
  route: RouteModel,
): Pick<
  OfflineRoute,
  | "title"
  | "region"
  | "description"
  | "startPoint"
  | "endPoint"
  | "distanceKm"
  | "durationMinutes"
  | "elevationGainM"
  | "difficulty"
  | "modality"
  | "creatorName"
> {
  return {
    title: route.title,
    region: route.region,
    description: route.description,
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    elevationGainM: route.elevationGainM,
    difficulty: route.difficulty,
    modality: route.modality,
    creatorName: route.creatorName,
  };
}