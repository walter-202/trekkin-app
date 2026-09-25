/**
 * HU-04 — PMTiles empaquetados en la app (rutas del seed, sin Storage ni CDN).
 */
import { Asset } from "expo-asset";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { isSeedRouteId } from "../../core/domain/seedRoutes";
import { BUNDLED_PMTILES_MODULES } from "./bundledPmtiles.generated";

const cacheRoot = (): string =>
  `${LegacyFileSystem.documentDirectory ?? LegacyFileSystem.cacheDirectory}trekkin/bundled-pmtiles/`;

function cachePath(routeId: string): string {
  const safe = routeId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${cacheRoot()}${safe}/basemap.pmtiles`;
}

/** True si esta ruta tiene un módulo empaquetado (tras `pmtiles:extract:seed`). */
export function hasBundledPmtilesModule(routeId: string): boolean {
  return isSeedRouteId(routeId) && routeId in BUNDLED_PMTILES_MODULES;
}

/**
 * Copia el PMTiles del bundle al directorio de documentos (WebView puede leerlo).
 * Devuelve la ruta local o null si no hay pack empaquetado.
 */
export async function getBundledPmtilesCachedPath(
  routeId: string,
): Promise<string | null> {
  const moduleId = BUNDLED_PMTILES_MODULES[routeId];
  if (!moduleId) return null;

  const dest = cachePath(routeId);
  try {
    const info = await LegacyFileSystem.getInfoAsync(dest);
    if (info.exists && (info.size ?? 0) > 4096) {
      return dest;
    }

    await LegacyFileSystem.makeDirectoryAsync(
      dest.replace(/basemap\.pmtiles$/, ""),
      { intermediates: true },
    );

    const asset = Asset.fromModule(moduleId);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    const source = asset.localUri ?? asset.uri;
    if (!source) return null;

    await LegacyFileSystem.copyAsync({ from: source, to: dest });
    const copied = await LegacyFileSystem.getInfoAsync(dest);
    if (!copied.exists || (copied.size ?? 0) <= 4096) {
      return null;
    }
    return dest;
  } catch {
    return null;
  }
}
