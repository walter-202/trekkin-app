/**
 * Formatos de pack de mapa base (HU-04) — dominio puro.
 * Capa de FONDO: un archivo PMTiles (V1) o MBTiles (V2 nativo).
 * No es la capa de usuario (eso es GPX/GeoJSON en trackFormats.ts).
 */

export type MapPackKind = "pmtiles" | "mbtiles";

export interface DetectMapPackInput {
  /** Ruta, URI o URL del archivo (.pmtiles / .mbtiles). */
  path: string;
  /** Primeros bytes del archivo (magia). Opcional si solo hay nombre. */
  headerBytes?: Uint8Array | number[] | string;
}

export interface DetectedMapPack {
  kind: MapPackKind;
  /** Cómo se detectó: magia de archivo o extensión. */
  via: "magic" | "extension";
}

export interface ResolvedOfflinePack {
  kind: MapPackKind;
  /**
   * V1 (GL JS / WebView) solo pinta PMTiles.
   * MBTiles exige conversión (`pmtiles convert`) o MapLibre Native (V2).
   */
  usableInV1: boolean;
  /** URL `pmtiles://…` para MapLibre, o null si no aplica. */
  protocolUrl: string | null;
  message: string | null;
}

const PMTILES_MAGIC = "PMTiles";
const SQLITE_MAGIC = "SQLite format 3";

function headerAsString(header?: Uint8Array | number[] | string): string {
  if (header == null) return "";
  if (typeof header === "string") return header;
  const bytes = header instanceof Uint8Array ? header : Uint8Array.from(header);
  let out = "";
  const n = Math.min(bytes.length, 16);
  for (let i = 0; i < n; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function extensionOf(path: string): string {
  const clean = path.trim().split(/[?#]/)[0].toLowerCase();
  const slash = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  const name = slash >= 0 ? clean.slice(slash + 1) : clean;
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

/**
 * Detecta PMTiles vs MBTiles por magia de archivo (prioridad) o extensión.
 */
export function detectMapPack(input: DetectMapPackInput): DetectedMapPack {
  const path = (input.path ?? "").trim();
  if (!path) {
    throw new Error("Indica el archivo del pack (PMTiles o MBTiles).");
  }

  const magic = headerAsString(input.headerBytes);
  if (magic.startsWith(PMTILES_MAGIC)) {
    return { kind: "pmtiles", via: "magic" };
  }
  if (magic.startsWith(SQLITE_MAGIC)) {
    return { kind: "mbtiles", via: "magic" };
  }

  const ext = extensionOf(path);
  if (ext === ".pmtiles") {
    return { kind: "pmtiles", via: "extension" };
  }
  if (ext === ".mbtiles") {
    return { kind: "mbtiles", via: "extension" };
  }

  throw new Error(
    "El pack debe ser .pmtiles (V1) o .mbtiles (V2). No se usan carpetas PNG.",
  );
}

/**
 * Prefijo de protocolo MapLibre. No duplica `pmtiles://`.
 */
export function toPmtilesProtocolUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error("La URL del pack PMTiles está vacía.");
  }
  if (trimmed.startsWith("pmtiles://")) {
    return trimmed;
  }
  return `pmtiles://${trimmed}`;
}

export function resolveOfflinePack(input: DetectMapPackInput): ResolvedOfflinePack {
  const detected = detectMapPack(input);
  if (detected.kind === "mbtiles") {
    return {
      kind: "mbtiles",
      usableInV1: false,
      protocolUrl: null,
      message:
        "El .mbtiles hay que convertirlo a .pmtiles (pmtiles convert) para Expo Go y web. En V2 nativo se puede leer directo.",
    };
  }
  return {
    kind: "pmtiles",
    usableInV1: true,
    protocolUrl: toPmtilesProtocolUrl(input.path.trim()),
    message: null,
  };
}
