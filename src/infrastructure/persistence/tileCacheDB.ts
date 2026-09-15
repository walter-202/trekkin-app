/**
 * HU-04 T9 — Repositorio de descargas offline (AsyncStorage).
 * Implementa los puertos de los casos de uso: guarda cada pieza por etapa
 * (mapa/trazado/info) en claves temporales y `finalize` ensambla el registro
 * completo + índice `trekkin_offline_routes_index`. Interfaz estable para
 * migrar a expo-file-system/expo-sqlite en futuras iteraciones (DESIGN_RULES §4).
 * Es capa persistencia: nada de `firebase/*` ni lógica de negocio aquí.
 */

import { appStorage } from "./storage";
import type { OfflineRoute } from "../../core/domain/offline";

const OFFLINE_ROUTE_PREFIX = "trekkin_offline_route";
const INDEX_KEY = "trekkin_offline_routes_index";

const mapTempKey = (id: string) => `${OFFLINE_ROUTE_PREFIX}_${id}_map`;
const trailTempKey = (id: string) => `${OFFLINE_ROUTE_PREFIX}_${id}_trail`;
const infoTempKey = (id: string) => `${OFFLINE_ROUTE_PREFIX}_${id}_info`;
const finalKey = (id: string) => `${OFFLINE_ROUTE_PREFIX}_${id}`;

async function readIndex(): Promise<string[]> {
  const raw = await appStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

async function writeIndex(ids: string[]): Promise<void> {
  await appStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Repositorio de descargas offline. Implementa los puertos de
 * `DownloadRouteOfflineUseCase` + consultas de `ListOfflineRoutesUseCase` /
 * `GetOfflineRouteUseCase`.
 */
export const tileCacheDB = {
  /** T6 — Persiste la pieza "mapa" (snapshot vectorial). */
  async saveMap(routeId: string, payload: string): Promise<void> {
    await appStorage.setItem(mapTempKey(routeId), payload);
  },

  /** T7 — Persiste la pieza "trazado". */
  async saveTrail(routeId: string, payload: string): Promise<void> {
    await appStorage.setItem(trailTempKey(routeId), payload);
  },

  /** T8 — Persiste la pieza "información básica". */
  async saveInfo(routeId: string, payload: string): Promise<void> {
    await appStorage.setItem(infoTempKey(routeId), payload);
  },

  /** T9 — Ensambla el registro completo, indexa y limpia temporales. */
  async finalize(routeId: string, record: OfflineRoute): Promise<void> {
    await appStorage.setItem(finalKey(routeId), JSON.stringify(record));
    const index = await readIndex();
    const nextIndex = index.includes(routeId)
      ? index
      : [...index, routeId];
    await writeIndex(nextIndex);
    await Promise.all([
      appStorage.removeItem(mapTempKey(routeId)),
      appStorage.removeItem(trailTempKey(routeId)),
      appStorage.removeItem(infoTempKey(routeId)),
    ]);
  },

  /** Lista todos los registros descargados (prunes índice huérfano). */
  async list(): Promise<OfflineRoute[]> {
    const index = await readIndex();
    const entries = await Promise.all(
      index.map(async (id) => ({ id, raw: await appStorage.getItem(finalKey(id)) })),
    );
    const records: OfflineRoute[] = [];
    const alive: string[] = [];
    for (const { id, raw } of entries) {
      const record = parseJson<OfflineRoute>(raw);
      if (record) {
        records.push(record);
        alive.push(id);
      }
    }
    if (alive.length !== index.length) await writeIndex(alive);
    return records;
  },

  /** Obtiene un registro descargado por id (null si no existe). */
  async get(routeId: string): Promise<OfflineRoute | null> {
    return parseJson<OfflineRoute>(await appStorage.getItem(finalKey(routeId)));
  },

  /** Estado para el detalle: ¿ya está descargada esta ruta? */
  async isDownloaded(routeId: string): Promise<boolean> {
    return (await appStorage.getItem(finalKey(routeId))) !== null;
  },
};