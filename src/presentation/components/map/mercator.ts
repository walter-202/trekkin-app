/**
 * Matemática pura del mapa Web Mercator (teselas OpenStreetMap).
 * Sin imports de React/RN/Firebase: funciones puras y testeables.
 */

export const TILE_SIZE = 256;
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 19;
export const MAX_LAT = 85;
export const MAX_LNG = 180;

export interface WorldPoint {
  x: number;
  y: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** lat/lng → píxel en el mundo (2^zoom * 256 px). */
export function latLngToWorldPoint(
  lat: number,
  lng: number,
  zoom: number,
): WorldPoint {
  const size = TILE_SIZE * Math.pow(2, zoom);
  const sinLat = clamp(Math.sin((lat * Math.PI) / 180), -0.9999, 0.9999);
  const x = ((lng + MAX_LNG) / 360) * size;
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * size;
  return { x, y };
}

/** píxel del mundo → lat/lng (con clamp a límites del mundo). */
export function worldPointToLatLng(
  x: number,
  y: number,
  zoom: number,
): GeoPoint {
  const size = TILE_SIZE * Math.pow(2, zoom);
  const lng = clamp((x / size) * 360 - MAX_LNG, -MAX_LNG, MAX_LNG);
  const lat = clamp(
    (180 / Math.PI) *
      Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))),
    -MAX_LAT,
    MAX_LAT,
  );
  return { lat, lng };
}

/** Zoom que encuadra una región (para initialRegion). */
export function zoomForRegion(region: MapRegion, w = 400, h = 300): number {
  const lngSpan = Math.max(region.longitudeDelta, 1e-4);
  const latSpan = Math.max(region.latitudeDelta, 1e-4);
  const cosLat = Math.max(
    Math.cos((region.latitude * Math.PI) / 180),
    0.05,
  );
  const zLng = Math.log2((w * 360) / (TILE_SIZE * lngSpan));
  const zLat = Math.log2((h * 360 * cosLat) / (TILE_SIZE * latSpan));
  return clamp(Math.min(zLng, zLat), MIN_ZOOM, MAX_ZOOM);
}

/** Zoom que encuadra un bounding box (para HU-03 con trazado). */
export function zoomForBounds(
  latSpan: number,
  lngSpan: number,
  centerLat: number,
  w: number,
  h: number,
): number {
  const ls = Math.max(latSpan, 1e-4);
  const gs = Math.max(lngSpan, 1e-4);
  const cosLat = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.05);
  const zLat = Math.log2((h * 360 * cosLat) / (TILE_SIZE * ls));
  const zLng = Math.log2((w * 360) / (TILE_SIZE * gs));
  return clamp(Math.min(zLat, zLng), MIN_ZOOM, MAX_ZOOM);
}