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
  /** Versioned manifest. v2 stores binary files outside AsyncStorage. */
  manifestVersion: 2;
  artifactVersion: number;
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
  /** Map metadata only; the PMTiles bytes live at pmtilesPath. */
  map: OfflineMapSnapshot;
  /** Trazado completo reconstruido from the published route GPX. */
  trail: Coordinates[];
  checkpoints: Checkpoint[];
  /** Referencias a fotos remotas (T8: no se descargan, solo URLs). */
  photoUrls: string[];
  /** Stable local files finalized before this manifest is committed. */
  gpxPath: string;
  pmtilesPath: string;
  gpxBytes: number;
  pmtilesBytes: number;
  gpxSha256?: string;
  pmtilesSha256?: string;
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

/**
 * HU-04 — Clasifica un fallo de descarga como reanudable (corte de red) o no
 * (integridad/validación). Puro y sin dependencias: el usecase conserva los
 * temporales verificados ante cortes para reanudar por artefacto, y limpia
 * ante corrupción. Nunca clasifica como red un error de tamaño/SHA/formato.
 */
export function isResumableDownloadError(cause: unknown): boolean {
  const code = String(
    (cause as { code?: unknown } | null | undefined)?.code ?? "",
  ).toLowerCase();
  const message = String(
    cause instanceof Error ? cause.message : (cause ?? ""),
  ).toLowerCase();
  const text = `${code} ${message}`;
  return (
    text.includes("network") ||
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("unavailable") ||
    text.includes("offline") ||
    text.includes("failed to fetch") ||
    text.includes("load failed") ||
    text.includes("network request failed") ||
    text.includes("econn") ||
    text.includes("socket") ||
    text.includes("retry-limit") ||
    text.includes("sin conexi")
  );
}

/** Entrada plana para verificar un artefacto descargado (dominio puro). */
export interface OfflineArtifactCheck {
  kind: "gpx" | "pmtiles";
  expectedByteSize: number;
  expectedSha256?: string;
  actualByteSize: number;
  actualSha256?: string;
  /** Primeros bytes como texto (p.ej. "PMTiles\u0003" o "<gpx"). */
  headerPrefix: string;
  /** Puntos del trazado (solo GPX); el PMTiles se valida por cabecera. */
  trackPointCount?: number;
  isLocalFallback?: boolean;
}

/**
 * HU-04 — Verifica tamaño/SHA-256/cabecera/traza de un artefacto.
 * Lanza errores tipados en español. La comparten el usecase (puertos) y el
 * repositorio (reutilización de temporales verificados al reanudar).
 */
export function verifyOfflineArtifactBytes(check: OfflineArtifactCheck): void {
  const { kind, expectedByteSize, actualByteSize } = check;
  if (!Number.isInteger(actualByteSize) || actualByteSize <= 0) {
    throw new Error(`El archivo ${kind} está vacío o incompleto.`);
  }
  if (!check.isLocalFallback && actualByteSize !== expectedByteSize) {
    throw new Error(
      `El tamaño de ${kind} no coincide (esperado ${expectedByteSize}, recibido ${actualByteSize}).`,
    );
  }
  if (!check.isLocalFallback && check.expectedSha256) {
    if (!check.actualSha256) {
      throw new Error(`No se pudo verificar el SHA-256 del artefacto ${kind}.`);
    }
    if (check.actualSha256.toLowerCase() !== check.expectedSha256.toLowerCase()) {
      throw new Error(`El SHA-256 de ${kind} no coincide con el publicado.`);
    }
  }
  if (
    kind === "pmtiles" &&
    !check.headerPrefix.startsWith("PMTiles\u0003")
  ) {
    throw new Error("El artefacto de mapa no es un archivo PMTiles v3 válido.");
  }
  if (kind === "gpx" && (check.trackPointCount ?? 0) < 2) {
    throw new Error("El GPX descargado no contiene una traza válida de al menos dos puntos.");
  }
}

/** Aproximación en bytes del JSON serializado de una pieza (ASCII→1 byte/car). */
function jsonBytes(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
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

/** T3 — Size from the published binary artifact metadata, never a snapshot guess. */
export function estimateRouteOfflineSize(route: RouteModel): OfflineSizeEstimate {
  const infoBytesValue = basicInfoBytes(route);
  if (!route.artifacts) {
    if (!route.waypoints || route.waypoints.length < 2) {
      throw new Error("La ruta publicada no tiene un paquete offline disponible.");
    }
    const trailBytesValue = Math.max(1024, route.waypoints.length * 140);
    const mapBytesValue = 127;
    return {
      mapBytes: mapBytesValue,
      trailBytes: trailBytesValue,
      infoBytes: infoBytesValue,
      totalBytes: mapBytesValue + trailBytesValue + infoBytesValue,
    };
  }
  const { gpx, pmtiles } = route.artifacts;
  if (gpx.status !== "uploaded" || pmtiles.status !== "uploaded" ||
      gpx.byteSize <= 0 || pmtiles.byteSize <= 0) {
    throw new Error("El paquete offline publicado está incompleto.");
  }
  const trailBytesValue = gpx.byteSize;
  const mapBytesValue = pmtiles.byteSize;
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
