/**
 * Binary offline bundle repository. AsyncStorage contains only the v2 manifest;
 * GPX and PMTiles remain files so large packs never enter JSON storage.
 */
import { getDownloadURL, ref } from "firebase/storage";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { File } from "expo-file-system";
import { storage } from "../firebase/config";
import { appStorage } from "./storage";
import type { RouteArtifactKind, RouteArtifactMetadata } from "../../core/domain/types";
import type { OfflineRoute } from "../../core/domain/offline";
import { isResumableDownloadError, verifyOfflineArtifactBytes } from "../../core/domain/offline";
import type { DownloadedOfflineArtifact } from "../../core/application/offline/DownloadRouteOffline.usecase";
import { parseGPX, buildGPX11 } from "../../core/domain/trackFormats";
import { routeDetailCache } from "./routeDetailCache";
import { routeService } from "../database/routeService";
import { sha256File } from "./sha256File";
import { ResolvePmtilesDownloadUrlUseCase } from "../../core/application/offline/ResolvePmtilesDownloadUrl.usecase";
import { getBundledPmtilesCachedPath } from "../map/bundledPmtiles";

function pmtilesCdnBase(): string | null {
  const base = process.env.EXPO_PUBLIC_PMTILES_CDN_BASE?.trim();
  return base || null;
}

const OFFLINE_ROUTE_PREFIX = "trekkin_offline_route";
const INDEX_KEY = "trekkin_offline_routes_index";
const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, "_");
const finalKey = (id: string) => `${OFFLINE_ROUTE_PREFIX}_${id}`;
const root = (): string => `${LegacyFileSystem.documentDirectory ?? LegacyFileSystem.cacheDirectory}trekkin/offline/routes/`;
const routeDirectory = (id: string): string => `${root()}${safeId(id)}/`;
const filePath = (id: string, name: string): string => `${routeDirectory(id)}${name}`;
const tempPath = (id: string, kind: RouteArtifactKind): string => filePath(id, `${kind}.download`);
const finalPath = (id: string, kind: RouteArtifactKind, generation: string): string =>
  filePath(id, `generations/${generation}/${kind === "gpx" ? "route.gpx" : "basemap.pmtiles"}`);

async function readIndex(): Promise<string[]> {
  const raw = await appStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}
async function writeIndex(ids: string[]): Promise<void> { await appStorage.setItem(INDEX_KEY, JSON.stringify(ids)); }
function parseJson<T>(raw: string | null): T | null { if (!raw) return null; try { return JSON.parse(raw) as T; } catch { return null; } }

async function ensureDirectory(id: string): Promise<void> {
  await LegacyFileSystem.makeDirectoryAsync(routeDirectory(id), { intermediates: true });
}
async function ensureGenerationDirectory(routeId: string, generation: string): Promise<void> {
  await LegacyFileSystem.makeDirectoryAsync(filePath(routeId, `generations/${generation}/`), { intermediates: true });
}
async function removeFile(path: string): Promise<void> {
  try {
    const info = await LegacyFileSystem.getInfoAsync(path);
    if (info.exists) await LegacyFileSystem.deleteAsync(path, { idempotent: true });
  } catch { /* cleanup is best effort after a failed download */ }
}
async function hasFile(path: string): Promise<boolean> {
  try {
    const info = await LegacyFileSystem.getInfoAsync(path);
    return info.exists && (info.size ?? 0) > 0;
  } catch { return false; }
}
function headerBytes(path: string): Uint8Array {
  const file = new File(path);
  const handle = file.open();
  try { return handle.readBytes(8); } finally { handle.close(); }
}

function headerPrefixOf(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes.slice(0, 8));
}

/**
 * HU-04 — Reutiliza un temporal verificado de un intento previo (reanudación
 * por artefacto). Solo se acepta si tamaño, SHA-256, cabecera y (GPX) traza
 * coinciden con lo publicado; cualquier duda → null y descarga fresca.
 */
async function peekVerifiedTemp(
  routeId: string,
  kind: RouteArtifactKind,
  metadata: RouteArtifactMetadata,
  generation: string,
): Promise<DownloadedOfflineArtifact | null> {
  try {
    const part = tempPath(routeId, kind);
    const info = await LegacyFileSystem.getInfoAsync(part);
    if (!info.exists || (info.size ?? 0) <= 0) return null;
    const header = headerPrefixOf(headerBytes(part));
    let trackPointCount: number | undefined;
    if (kind === "gpx") {
      const points = parseGPX(await LegacyFileSystem.readAsStringAsync(part)).points;
      trackPointCount = points.length;
    }
    const staged: DownloadedOfflineArtifact = {
      tempPath: part,
      finalPath: finalPath(routeId, kind, generation),
      byteSize: info.size ?? 0,
      headerBytes: header,
      ...(metadata.sha256 ? { sha256: sha256File(part) } : {}),
      ...(kind === "gpx"
        ? {
            readTrackPoints: async () =>
              parseGPX(await LegacyFileSystem.readAsStringAsync(part)).points,
          }
        : {}),
    };
    verifyOfflineArtifactBytes({
      kind,
      expectedByteSize: metadata.byteSize,
      ...(metadata.sha256 ? { expectedSha256: metadata.sha256 } : {}),
      actualByteSize: staged.byteSize,
      ...(staged.sha256 ? { actualSha256: staged.sha256 } : {}),
      headerPrefix: header,
      ...(trackPointCount !== undefined ? { trackPointCount } : {}),
      allowApproximateSize:
        kind === "pmtiles" &&
        Boolean(metadata.downloadUrl) &&
        !metadata.sha256,
    });
    return staged;
  } catch {
    return null;
  }
}

export const tileCacheDB = {
  async downloadArtifact(routeId: string, kind: RouteArtifactKind, metadata: RouteArtifactMetadata, generation = "current"): Promise<DownloadedOfflineArtifact> {
    await ensureDirectory(routeId);
    const part = tempPath(routeId, kind);
    // Reanudar: un temporal verificado de un intento previo evita re-descargar.
    const resumed = await peekVerifiedTemp(routeId, kind, metadata, generation);
    if (resumed) return resumed;
    await removeFile(part);
    try {
      let downloadedFromRemote = false;
      let isBundledCopy = false;

      if (kind === "pmtiles") {
        const bundled = await getBundledPmtilesCachedPath(routeId);
        if (bundled) {
          try {
            await LegacyFileSystem.copyAsync({ from: bundled, to: part });
            const info = await LegacyFileSystem.getInfoAsync(part);
            if (info.exists && (info.size ?? 0) > 0) {
              downloadedFromRemote = true;
              isBundledCopy = true;
            }
          } catch {
            downloadedFromRemote = false;
          }
        }
      }

      const protomapsUrl =
        !downloadedFromRemote && kind === "pmtiles"
          ? ResolvePmtilesDownloadUrlUseCase(routeId, metadata, {
              cdnBase: pmtilesCdnBase(),
            })
          : !downloadedFromRemote
            ? metadata.downloadUrl?.trim() || null
            : null;

      if (!downloadedFromRemote && protomapsUrl?.startsWith("https://")) {
        try {
          await LegacyFileSystem.downloadAsync(protomapsUrl, part, { md5: false });
          const info = await LegacyFileSystem.getInfoAsync(part);
          if (info.exists && (info.size ?? 0) > 0) {
            downloadedFromRemote = true;
          }
        } catch {
          downloadedFromRemote = false;
        }
      }

      if (!downloadedFromRemote) {
        try {
          const url = await getDownloadURL(ref(storage, metadata.storagePath));
          await LegacyFileSystem.downloadAsync(url, part, { md5: false });
          const info = await LegacyFileSystem.getInfoAsync(part);
          if (info.exists && (info.size ?? 0) > 0) {
            downloadedFromRemote = true;
          }
        } catch {
          downloadedFromRemote = false;
        }
      }

      let isLocalFallback = false;
      if (!downloadedFromRemote) {
        isLocalFallback = true;
        if (kind === "gpx") {
          const cached = await routeDetailCache.get(routeId);
          const route = cached ?? (await routeService.getRouteById(routeId));
          if (!route) {
            throw new Error("No se pudo obtener la información de la ruta para generar el archivo GPX.");
          }
          const gpxXml = buildGPX11({
            name: route.title,
            description: route.description,
            points: route.waypoints,
            waypoints: route.checkpoints,
          });
          await LegacyFileSystem.writeAsStringAsync(part, gpxXml, {
            encoding: LegacyFileSystem.EncodingType.UTF8,
          });
        } else if (kind === "pmtiles") {
          throw new Error(
            "No se pudo descargar el mapa offline desde el servidor. Verifica tu conexión o que la ruta tenga un paquete PMTiles publicado.",
          );
        }
      }

      const info = await LegacyFileSystem.getInfoAsync(part);
      if (!info.exists || !info.size) throw new Error(`El archivo ${kind} no está disponible o quedó vacío.`);
      return {
        tempPath: part,
        finalPath: finalPath(routeId, kind, generation),
        byteSize: info.size,
        headerBytes: headerBytes(part),
        isLocalFallback: isLocalFallback || isBundledCopy,
        ...(metadata.sha256 && !isLocalFallback ? { sha256: sha256File(part) } : {}),
        ...(kind === "gpx" ? {
          readTrackPoints: async () => parseGPX(await LegacyFileSystem.readAsStringAsync(part)).points,
        } : {}),
      };
    } catch (error) {
      // Ante un corte de red el parcial se conserva (el próximo intento lo
      // valida por tamaño/SHA y lo reutiliza o lo descarta); ante corrupción
      // se elimina para reintentar limpio.
      if (!isResumableDownloadError(error)) await removeFile(part);
      throw error;
    }
  },

  async cleanupArtifact(path: string): Promise<void> { await removeFile(path); },

  /** HU-04 — Espacio libre del dispositivo para el gate previo a descargar. */
  async getFreeDiskBytes(): Promise<number | null> {
    try {
      const free = await LegacyFileSystem.getFreeDiskStorageAsync();
      return Number.isFinite(free) && free >= 0 ? free : null;
    } catch {
      return null;
    }
  },

  /**
   * Finalizes both files first; the manifest/index are committed only after
   * both moves succeed. New generations never overwrite the generation used
   * by the current manifest, so a failed replacement leaves the old bundle
   * readable and intact.
   */
  async finalize(routeId: string, record: OfflineRoute, files: { gpx: DownloadedOfflineArtifact; pmtiles: DownloadedOfflineArtifact }): Promise<void> {
    await ensureDirectory(routeId);
    const moved: string[] = [];
    const previousRaw = await appStorage.getItem(finalKey(routeId));
    const previousIndexRaw = await appStorage.getItem(INDEX_KEY);
    const previous = parseJson<OfflineRoute>(previousRaw);
    try {
      await ensureGenerationDirectory(
        routeId,
        record.pmtilesPath.split("/generations/")[1]?.split("/")[0] ?? "current",
      );
      await new File(files.gpx.tempPath).move(new File(record.gpxPath), { overwrite: false });
      moved.push(record.gpxPath);
      await new File(files.pmtiles.tempPath).move(new File(record.pmtilesPath), { overwrite: false });
      moved.push(record.pmtilesPath);
      await appStorage.setItemStrict(finalKey(routeId), JSON.stringify(record));
      const index = await readIndex();
      await appStorage.setItemStrict(INDEX_KEY, JSON.stringify(index.includes(routeId) ? index : [...index, routeId]));
    } catch (error) {
      await Promise.allSettled([
        ...moved.map((path) => removeFile(path)),
        removeFile(files.gpx.tempPath),
        removeFile(files.pmtiles.tempPath),
        previousRaw == null ? appStorage.removeItemStrict(finalKey(routeId)) : appStorage.setItemStrict(finalKey(routeId), previousRaw),
        previousIndexRaw == null ? appStorage.removeItemStrict(INDEX_KEY) : appStorage.setItemStrict(INDEX_KEY, previousIndexRaw),
      ]);
      throw error;
    }
    // Only after the new manifest is durable may old generation files go.
    if (previous && previous.manifestVersion === 2) {
      await Promise.all([removeFile(previous.gpxPath), removeFile(previous.pmtilesPath)]);
    }
  },

  async list(): Promise<OfflineRoute[]> {
    const index = await readIndex();
    const entries = await Promise.all(index.map(async (id) => ({ id, raw: await appStorage.getItem(finalKey(id)) })));
    const records: OfflineRoute[] = [];
    const alive: string[] = [];
    for (const { id, raw } of entries) {
      const record = parseJson<OfflineRoute>(raw);
      if (record?.manifestVersion === 2 && await hasFile(record.gpxPath) && await hasFile(record.pmtilesPath)) {
        records.push(record); alive.push(id);
      }
    }
    if (alive.length !== index.length) await writeIndex(alive);
    return records.sort((a, b) => b.downloadedAt - a.downloadedAt);
  },

  async get(routeId: string): Promise<OfflineRoute | null> {
    const record = parseJson<OfflineRoute>(await appStorage.getItem(finalKey(routeId)));
    if (!record || record.manifestVersion !== 2) return null;
    if (!(await hasFile(record.gpxPath)) || !(await hasFile(record.pmtilesPath))) return null;
    return record;
  },
  async isDownloaded(routeId: string): Promise<boolean> {
    const record = await this.get(routeId);
    return record?.manifestVersion === 2;
  },
};
