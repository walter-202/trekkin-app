/**
 * Configuración de estilo MapLibre (HU-03 online, HU-04 pack).
 * Sin API keys. OpenFreeMap sirve vector tiles OSM con estilo JSON MapLibre.
 * No mezclar con UrlTile/PNG: OpenFreeMap no es un template {z}/{x}/{y}.
 */
export const MAPLIBRE_GL_VERSION = "5.6.1";

export const MAPLIBRE_GL_JS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_GL_VERSION}/dist/maplibre-gl.js`;
export const MAPLIBRE_GL_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_GL_VERSION}/dist/maplibre-gl.css`;

/** Cliente PMTiles (CDN, mismo patrón que MapLibre). No infla el bundle nativo. */
export const PMTILES_VERSION = "3.2.1";
export const PMTILES_JS_URL = `https://unpkg.com/pmtiles@${PMTILES_VERSION}/dist/pmtiles.js`;

/**
 * Estilo mínimo andino para un archivo .pmtiles (OpenMapTiles y Protomaps).
 * Capas ausentes en el pack se ignoran; el GPX/trail se pinta encima igual.
 */
export function buildOfflineVectorStyle(pmtilesProtocolUrl: string): {
  version: 8;
  name: string;
  sources: Record<string, unknown>;
  layers: Array<Record<string, unknown>>;
} {
  return {
    version: 8,
    name: "Trekkin Offline",
    sources: {
      openmaptiles: {
        type: "vector",
        url: pmtilesProtocolUrl,
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#06231B" },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": "#051712" },
      },
      {
        id: "earth",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "earth",
        paint: { "fill-color": "#0E2E24" },
      },
      {
        id: "landcover",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        paint: { "fill-color": "#153E32" },
      },
      {
        id: "landuse",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        paint: { "fill-color": "#0E2E24" },
      },
      {
        id: "transportation",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        paint: { "line-color": "#1A4537", "line-width": 1.2 },
      },
      {
        id: "roads",
        type: "line",
        source: "openmaptiles",
        "source-layer": "roads",
        paint: { "line-color": "#265D4B", "line-width": 1.4 },
      },
    ],
  };
}

/** Estilo oscuro andino, sin token. HU-03 detalle: solo esta URL, sin descargar pack. */
export const ONLINE_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

export const MAP_ATTRIBUTION = "© OpenStreetMap · © OpenFreeMap";

export const DEFAULT_CENTER: [number, number] = [-68.146, -16.499];
export const DEFAULT_ZOOM = 11;
