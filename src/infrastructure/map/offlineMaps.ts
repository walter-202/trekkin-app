import { tileCache, ensureTilesReady } from '../persistence/tileCache';

/**
 * Offline Maps — Módulo de caché de teselas 100% nativo.
 *
 * Implementa la intención de Nyls (1500 teselas offline) sin depender de
 * MapLibre, WebViews ni módulos nativos binarios. Funciona en Expo Go
 * y cualquier build de Expo SDK 57.
 *
 * El almacenamiento se basa en `tileCache.ts` (AsyncStorage + memoria LRU).
 */

let initialized = false;

/**
 * Inicializa la caché offline de teselas con el límite configurado.
 * Idempotente: llamar múltiples veces no tiene efecto.
 */
export async function ensureMapOfflineCache(): Promise<void> {
  if (initialized) return;
  try {
    await ensureTilesReady();
    initialized = true;
  } catch {
    // La caché de mapa nunca debe romper la app.
  }
}

/**
 * Estadísticas de la caché offline para diagnóstico y UI.
 */
export interface OfflineCacheStats {
  cachedTiles: number;
  deniedTiles: number;
  maxTiles: number;
}

/**
 * Retorna estadísticas de la caché offline de teselas.
 */
export async function getOfflineCacheStats(): Promise<OfflineCacheStats> {
  await ensureMapOfflineCache();
  const stats = tileCache.getStats();
  return {
    cachedTiles: stats.cached,
    deniedTiles: stats.denied,
    maxTiles: stats.maxTiles,
  };
}

/**
 * Purga la caché local de teselas (reinicia a estado limpio).
 */
export async function clearOfflineCache(): Promise<void> {
  await tileCache.clear();
  initialized = false;
}
