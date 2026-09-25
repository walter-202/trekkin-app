/** Downloads a published route's binary bundle using framework-free ports. */
import type { Coordinates, RouteArtifactKind, RouteArtifactMetadata, RouteModel } from "../../domain/types";
import { buildBasicOfflineInfo, buildMapSnapshot, DOWNLOAD_STAGES, estimateRouteOfflineSize, isResumableDownloadError, verifyOfflineArtifactBytes, type OfflineArtifactCheck, type OfflineRoute, type OfflineDownloadStage } from "../../domain/offline";
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
function verifyArtifact(kind: RouteArtifactKind, expected: RouteArtifactMetadata, actual: DownloadedOfflineArtifact, trackPointCount?: number): void {
  if (!actual.tempPath || !actual.finalPath) throw new Error(`La descarga de ${kind} no produjo un archivo temporal válido.`);
  const check: OfflineArtifactCheck = {
    kind,
    expectedByteSize: expected.byteSize,
    actualByteSize: actual.byteSize,
    headerPrefix: headerString(actual.headerBytes),
    isLocalFallback: actual.isLocalFallback,
    allowApproximateSize:
      kind === "pmtiles" &&
      Boolean(expected.downloadUrl) &&
      !expected.sha256,
    ...(expected.sha256 ? { expectedSha256: expected.sha256 } : {}),
    ...(actual.sha256 ? { actualSha256: actual.sha256 } : {}),
    ...(trackPointCount !== undefined ? { trackPointCount } : {}),
  };
  verifyOfflineArtifactBytes(check);
}

export async function DownloadRouteOfflineUseCase(route: RouteModel, ports: DownloadRouteOfflinePorts, options: DownloadRouteOfflineOptions = {}): Promise<OfflineRoute> {
  if (route.status !== "published") throw new Error("Solo se pueden descargar rutas publicadas.");
  if (!route.artifacts) {
    throw new Error("La ruta publicada no tiene artefactos GPX y PMTiles.");
  }
  const artifacts = ValidateRoutePublicationUseCase(route.id, route.artifacts);
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
    const trackPoints = await gpx.readTrackPoints?.();
    verifyArtifact("gpx", artifacts.gpx, gpx, trackPoints?.length);
    if (!trackPoints) {
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
    // Ante un corte de red los temporales verificados se conservan para
    // reanudar por artefacto; ante corrupción se limpian para reintentar limpio.
    if (!isResumableDownloadError(cause)) {
      await Promise.allSettled(temporary.map((path) => ports.cleanupArtifact(path)));
    }
    throw cause;
  }
}

export const DOWNLOAD_STAGE_LABELS: Record<OfflineDownloadStage, string> = {
  map: "Descargando paquete de mapa…", trail: "Descargando GPX y preparando trazado…", info: "Guardando manifiesto offline…",
};
export { DOWNLOAD_STAGES };
