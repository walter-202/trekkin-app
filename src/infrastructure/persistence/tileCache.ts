import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Caché de teselas (HU-07 / futuro HU-04).
 *
 * Proveedor: OpenStreetMap (tiles gratuitas, sin API key).
 * Cumplimiento estricto de la política de uso (osmfoundation.org):
 *  - User-Agent propio con nombre de app y contacto.
 *  - Peticiones serializadas con separación mínima (≤ 5 teselas/s).
 *  - Las teselas denegadas (HTTP 403/block) se recuerdan y NO se reintentan.
 *  - Caché persistente en AsyncStorage: una zona vista una vez se muestra
 *    sin red, evitando descargas repetidas.
 *
 * v2: prefijo de caché por proveedor. Los z/x/y son los mismos en cualquier
 * servidor, así que cada vez que cambie la URL base se debe subir este prefijo
 * para no reutilizar teselas ni "denegadas" del provider anterior.
 *
 * Persiste las teselas descargadas como data-URI en AsyncStorage. LRU con
 * tope de MAX_TILES. Nunca lanza errores: si la caché falla se degrada a red.
 */
const PREFIX = 'trekking_tile_v4';
const INDEX_KEY = `${PREFIX}_index`;
const DENIED_KEY = `${PREFIX}_denied`;
const MAX_TILES = 1500;
const MAX_DENIED = 500;

// Separación mínima entre descargas. CARTO tolera más que el servidor de
// OSM; 200 ms (~5/s) llena el mapa sin demorar la experiencia de usuario.
const REQUEST_GAP_MS = 200;

// OSM exige un User-Agent propio: "nombreApp/versión (descripción; contacto)".
// Reemplaza <contacto> por un correo real del equipo antes de publicar.
const OSM_USER_AGENT =
  'TrekkinApp/1.0 (proyecto académico; contacto: trekkin-contacto@example.com)';

let memory = new Map<string, string>();
let index: string[] = [];
let denied = new Set<string>();
let initialized: Promise<void> | null = null;

const tileKey = (z: number, x: number, y: number): string => `${z}/${x}/${y}`;
const fullKey = (key: string): string => `${PREFIX}:${key}`;

export const tileCache = {
  async initialize(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          index = parsed.filter((k): k is string => typeof k === 'string');
        }
      }
      const deniedRaw = await AsyncStorage.getItem(DENIED_KEY);
      if (deniedRaw) {
        const parsed = JSON.parse(deniedRaw);
        if (Array.isArray(parsed)) {
          denied = new Set(parsed.filter((k): k is string => typeof k === 'string'));
        }
      }
    } catch {
      // La caché de teselas jamás debe romper la app.
    }
  },

  isDenied(z: number, x: number, y: number): boolean {
    return denied.has(tileKey(z, x, y));
  },

  async markDenied(z: number, x: number, y: number): Promise<void> {
    const key = tileKey(z, x, y);
    denied.add(key);
    if (denied.size > MAX_DENIED) {
      const first = denied.values().next().value;
      if (first !== undefined) denied.delete(first);
    }
    try {
      await AsyncStorage.setItem(DENIED_KEY, JSON.stringify([...denied]));
    } catch {
      // Solo memoria.
    }
  },

  async get(z: number, x: number, y: number): Promise<string | null> {
    const key = tileKey(z, x, y);
    const hit = memory.get(key);
    if (hit !== undefined) return hit;
    try {
      const raw = await AsyncStorage.getItem(fullKey(key));
      if (raw) memory.set(key, raw);
      return raw;
    } catch {
      return null;
    }
  },

  async put(
    z: number,
    x: number,
    y: number,
    dataUri: string,
  ): Promise<void> {
    const key = tileKey(z, x, y);
    memory.set(key, dataUri);
    const prevIndex = index.indexOf(key);
    if (prevIndex !== -1) index.splice(prevIndex, 1);
    index.push(key);
    const evicted =
      index.length > MAX_TILES ? index.splice(0, index.length - MAX_TILES) : [];
    try {
      for (const k of evicted) {
        memory.delete(k);
        await AsyncStorage.removeItem(fullKey(k));
      }
      await AsyncStorage.setItem(fullKey(key), dataUri);
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
      // Toleramos fallos de escritura: solo se pierde la tesela nueva.
    }
  },

  /** Returns stats for diagnostics and UI (offlineMaps.ts). */
  getStats(): { cached: number; denied: number; maxTiles: number } {
    return { cached: index.length, denied: denied.size, maxTiles: MAX_TILES };
  },

  /** Purges all cached and denied tiles. */
  async clear(): Promise<void> {
    const keys = index.map(fullKey);
    memory = new Map();
    index = [];
    denied = new Set();
    initialized = null;
    try {
      for (const k of keys) {
        await AsyncStorage.removeItem(k);
      }
      await AsyncStorage.removeItem(INDEX_KEY);
      await AsyncStorage.removeItem(DENIED_KEY);
    } catch {
      // Toleramos fallos de limpieza.
    }
  },
};

/** Inicializa la caché una sola vez (idempotente para llamadores concurrentes). */
export function ensureTilesReady(): Promise<void> {
  if (!initialized) {
    initialized = tileCache.initialize();
  }
  return initialized;
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(
      ...Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
};

// Cola FIFO global: las descargas de teselas se serializan con una separación
// mínima para cumplir el límite de ~2 peticiones/s de la política de OSM.
let queue: Array<() => Promise<unknown>> = [];
let draining = false;
let lastFetchAt = 0;
const maxWait = (gap: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, gap));

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve) => {
    queue.push(() => job().then(resolve));
    if (!draining) void drain();
  });
}

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) continue;
      const wait = Math.max(0, lastFetchAt + REQUEST_GAP_MS - Date.now());
      if (wait > 0) await maxWait(wait);
      lastFetchAt = Date.now();
      try {
        await job();
      } catch {
        // La tesela individual no debe romper la cola.
      }
    }
  } finally {
    draining = false;
  }
}

/**
 * Descarga una tesela como data-URI (nativo). Regresa si OSM la denegó
 * (403/block) para no reintentarla. Solo se usa en nativo; en web el
 * navegador sirve la caché y este puente está limitado por CORS.
 */
export async function fetchTileAsDataUri(
  url: string,
  timeoutMs = 6000,
): Promise<{ dataUri: string | null; blocked: boolean }> {
  return enqueue(() => doFetchTileAsDataUri(url, timeoutMs));
}

async function doFetchTileAsDataUri(
  url: string,
  timeoutMs: number,
): Promise<{ dataUri: string | null; blocked: boolean }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': OSM_USER_AGENT },
    });
    clearTimeout(timer);
    if (res.status === 403) return { dataUri: null, blocked: true };
    if (!res.ok) return { dataUri: null, blocked: false };
    const buf = await res.arrayBuffer();
    const dataUri = `data:image/png;base64,${bytesToBase64(new Uint8Array(buf))}`;
    return { dataUri, blocked: false };
  } catch {
    return { dataUri: null, blocked: false };
  }
}