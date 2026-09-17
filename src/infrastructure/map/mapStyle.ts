/**
 * Configuración de estilo MapLibre (HU-03 online, HU-04 pack).
 * Sin API keys. OpenFreeMap sirve vector tiles OSM con estilo JSON MapLibre.
 * No mezclar con UrlTile/PNG: OpenFreeMap no es un template {z}/{x}/{y}.
 */
export const MAPLIBRE_GL_VERSION = "5.6.1";

export const MAPLIBRE_GL_JS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_GL_VERSION}/dist/maplibre-gl.js`;
export const MAPLIBRE_GL_CSS_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_GL_VERSION}/dist/maplibre-gl.css`;

/** Estilo oscuro andino, sin token. HU-03 detalle: solo esta URL, sin descargar pack. */
export const ONLINE_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

export const MAP_ATTRIBUTION = "© OpenStreetMap · © OpenFreeMap";

export const DEFAULT_CENTER: [number, number] = [-68.146, -16.499];
export const DEFAULT_ZOOM = 11;
