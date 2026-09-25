import type { RouteArtifactMetadata } from "../../domain/types";

/**
 * HU-04 — Resuelve la URL HTTPS del PMTiles publicado (Protomaps + CDN).
 * Puro: la base CDN se inyecta desde infrastructure (env).
 */
export function ResolvePmtilesDownloadUrlUseCase(
  routeId: string,
  metadata: RouteArtifactMetadata,
  options: { cdnBase?: string | null } = {},
): string | null {
  if (metadata.kind !== "pmtiles") return null;
  const direct = metadata.downloadUrl?.trim();
  if (direct?.startsWith("https://")) return direct;

  const cdnBase = options.cdnBase?.trim();
  if (cdnBase) {
    const safeId = routeId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${cdnBase.replace(/\/$/, "")}/${safeId}/basemap.pmtiles`;
  }
  return null;
}
