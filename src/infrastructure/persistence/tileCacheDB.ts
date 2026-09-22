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
import type { DownloadedOfflineArtifact } from "../../core/application/offline/DownloadRouteOffline.usecase";
import { parseGPX } from "../../core/domain/trackFormats";
import { sha256File } from "./sha256File";

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

export const tileCacheDB = {
  async downloadArtifact(routeId: string, kind: RouteArtifactKind, metadata: RouteArtifactMetadata, generation = "current"): Promise<DownloadedOfflineArtifact> {
    await ensureDirectory(routeId);
    const part = tempPath(routeId, kind);
    await removeFile(part);
    try {
      const url = await getDownloadURL(ref(storage, metadata.storagePath));
      await LegacyFileSystem.downloadAsync(url, part, { md5: false });
      const info = await LegacyFileSystem.getInfoAsync(part);
      if (!info.exists || !info.size) throw new Error(`El archivo ${kind} no está disponible o quedó vacío.`);
      return {
        tempPath: part,
        finalPath: finalPath(routeId, kind, generation),
        byteSize: info.size,
        headerBytes: headerBytes(part),
        ...(metadata.sha256 ? { sha256: sha256File(part) } : {}),
        ...(kind === "gpx" ? {
          readTrackPoints: async () => parseGPX(await LegacyFileSystem.readAsStringAsync(part)).points,
        } : {}),
      };
    } catch (error) {
      await removeFile(part);
      throw error;
    }
  },

  async cleanupArtifact(path: string): Promise<void> { await removeFile(path); },

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
