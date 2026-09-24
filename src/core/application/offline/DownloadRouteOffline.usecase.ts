/** Downloads a published route's binary bundle using framework-free ports. */
import type { Coordinates, RouteArtifactKind, RouteArtifactMetadata, RouteModel } from "../../domain/types";
import { buildBasicOfflineInfo, buildMapSnapshot, DOWNLOAD_STAGES, estimateRouteOfflineSize, type OfflineRoute, type OfflineDownloadStage } from "../../domain/offline";
import { OfflineRouteSchema } from "../../domain/offline.schemas";
import { ValidateRoutePublicationUseCase } from "../route/PublishRoute.usecase";

export type DownloadStageCallback = (stage: OfflineDownloadStage) => void;
export interface DownloadedOfflineArtifact {
  tempPath: string;
  finalPath: string;
  byteSize: number;
  sha256?: string;
  headerBytes?: Uint8Array | number[] | string;
  readTrackPoints?: () => Promise<Coordinates[]>;
  isLocalFallback?: boolean;
}
export interface DownloadRouteOfflinePorts {
  downloadArtifact: (routeId: string, kind: RouteArtifactKind, metadata: RouteArtifactMetadata, generation?: string) => Promise<DownloadedOfflineArtifact>;
  cleanupArtifact: (path: string) => Promise<void>;
  finalize: (routeId: string, record: OfflineRoute, files: { gpx: DownloadedOfflineArtifact; pmtiles: DownloadedOfflineArtifact }) => Promise<void>;
}
export interface DownloadRouteOfflineOptions { onStage?: DownloadStageCallback; downloadedAt?: number; }

function toMB(bytes: number): number { return Math.round((bytes / (1024 * 1024)) * 100) / 100; }
function headerString(header?: Uint8Array | number[] | string): string {
  if (header == null) return "";
  if (typeof header === "string") return header;
  const bytes = header instanceof Uint8Array ? header : Uint8Array.from(header);
  return String.fromCharCode(...bytes.slice(0, 8));
}
function verifyArtifact(kind: RouteArtifactKind, expected: RouteArtifactMetadata, actual: DownloadedOfflineArtifact): void {
  if (!actual.tempPath || !actual.finalPath) throw new Error(`La descarga de ${kind} no produjo un archivo temporal válido.`);
  if (!Number.isInteger(actual.byteSize) || actual.byteSize <= 0) throw new Error(`El archivo ${kind} está vacío o incompleto.`);
  if (!actual.isLocalFallback && actual.byteSize !== expected.byteSize) throw new Error(`El tamaño de ${kind} no coincide (esperado ${expected.byteSize}, recibido ${actual.byteSize}).`);
  if (!actual.isLocalFallback && expected.sha256) {
    if (!actual.sha256) throw new Error(`No se pudo verificar el SHA-256 del artefacto ${kind}.`);
    if (actual.sha256.toLowerCase() !== expected.sha256.toLowerCase()) throw new Error(`El SHA-256 de ${kind} no coincide con el publicado.`);
  }
  if (kind === "pmtiles" && !headerString(actual.headerBytes).startsWith("PMTiles\u0003")) throw new Error("El artefacto de mapa no es un archivo PMTiles v3 válido.");
}

export async function DownloadRouteOfflineUseCase(route: RouteModel, ports: DownloadRouteOfflinePorts, options: DownloadRouteOfflineOptions = {}): Promise<OfflineRoute> {
  if (route.status !== "published") throw new Error("Solo se pueden descargar rutas publicadas.");
  if (!route.artifacts && (!route.waypoints || route.waypoints.length < 2)) {
    throw new Error("La ruta publicada no tiene artefactos GPX y PMTiles.");
  }
  const artifacts = route.artifacts
    ? ValidateRoutePublicationUseCase(route.id, route.artifacts)
    : {
        version: 1,
        gpx: {
          kind: "gpx" as const,
          version: 1,
          storagePath: `routes/${route.id}/v1/route.gpx`,
          fileName: "route.gpx" as const,
          mimeType: "application/gpx+xml" as const,
          byteSize: Math.max(1024, route.waypoints.length * 140),
          status: "uploaded" as const,
          updatedAt: route.updatedAt || Date.now(),
        },
        pmtiles: {
          kind: "pmtiles" as const,
          version: 1,
          storagePath: `routes/${route.id}/v1/basemap.pmtiles`,
          fileName: "basemap.pmtiles" as const,
          mimeType: "application/vnd.pmtiles" as const,
          byteSize: 127,
          status: "uploaded" as const,
          updatedAt: route.updatedAt || Date.now(),
        },
      };
  const onStage = options.onStage ?? (() => {});
  const downloadedAt = options.downloadedAt ?? Date.now();
  const generation = `${downloadedAt.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const temporary: string[] = [];
  let gpx: DownloadedOfflineArtifact | undefined;
  let pmtiles: DownloadedOfflineArtifact | undefined;
  try {
    onStage("map");
    pmtiles = await ports.downloadArtifact(route.id, "pmtiles", artifacts.pmtiles, generation);
    temporary.push(pmtiles.tempPath);
    verifyArtifact("pmtiles", artifacts.pmtiles, pmtiles);
    onStage("trail");
    gpx = await ports.downloadArtifact(route.id, "gpx", artifacts.gpx, generation);
    temporary.push(gpx.tempPath);
    verifyArtifact("gpx", artifacts.gpx, gpx);
    const trackPoints = await gpx.readTrackPoints?.();
    if (!trackPoints || trackPoints.length < 2) {
      throw new Error("El GPX descargado no contiene una traza válida de al menos dos puntos.");
    }
    onStage("info");
    const estimate = estimateRouteOfflineSize(route);
    const routeWithTrack = { ...route, waypoints: trackPoints };
    const record: OfflineRoute = OfflineRouteSchema.parse({
      manifestVersion: 2, artifactVersion: artifacts.version, routeId: route.id, ...buildBasicOfflineInfo(routeWithTrack),
      map: buildMapSnapshot(routeWithTrack), trail: trackPoints, checkpoints: route.checkpoints, photoUrls: route.photos,
      gpxPath: gpx.finalPath, pmtilesPath: pmtiles.finalPath, gpxBytes: gpx.byteSize, pmtilesBytes: pmtiles.byteSize,
      ...(gpx.sha256 ? { gpxSha256: gpx.sha256 } : {}), ...(pmtiles.sha256 ? { pmtilesSha256: pmtiles.sha256 } : {}),
      estimatedSizeMB: toMB(estimate.totalBytes), downloadedAt,
    });
    await ports.finalize(route.id, record, { gpx, pmtiles });
    return record;
  } catch (cause: unknown) {
    await Promise.allSettled(temporary.map((path) => ports.cleanupArtifact(path)));
    throw cause;
  }
}

export const DOWNLOAD_STAGE_LABELS: Record<OfflineDownloadStage, string> = {
  map: "Descargando paquete de mapa…", trail: "Descargando GPX y preparando trazado…", info: "Guardando manifiesto offline…",
};
export { DOWNLOAD_STAGES };
