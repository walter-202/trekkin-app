import type { Coordinates } from "./types";

/**
 * Clean Architecture — Cálculos geográficos (HU-06).
 * Funciones puras para distancia, filtrado GPS y distancia restante sobre el trazado.
 * Sin dependencias de mapas ni frameworks.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia geográfica en kilómetros entre dos coordenadas (Fórmula de Haversine). */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distancia en metros entre dos coordenadas. */
export function distanceM(a: Coordinates, b: Coordinates): number {
  return haversineKm(a, b) * 1000;
}

export interface TrackFilterOptions {
  /** Descartar puntos que se desplazan menos que este umbral (jitter). */
  minDeltaM?: number;
  /** Descartar puntos que saltan más que este umbral (errores GPS grandes). */
  maxJumpM?: number;
}

/**
 * Filtra una secuencia de puntos GPS conservando el trayecto real:
 * - puntos demasiado cercanos al último conservado (ruido) se descartan;
 * - desplazamientos muy grandes (saltos por error GPS) se descartan.
 * El primer punto siempre se conserva.
 */
export function cleanTrack(
  points: Coordinates[],
  options: TrackFilterOptions = {},
): Coordinates[] {
  const minDeltaM = options.minDeltaM ?? 0;
  const maxJumpM = options.maxJumpM ?? Infinity;
  const kept: Coordinates[] = [];
  for (const p of points) {
    if (kept.length === 0) {
      kept.push(p);
      continue;
    }
    const last = kept[kept.length - 1];
    const d = distanceM(last, p);
    if (d >= minDeltaM && d <= maxJumpM) {
      kept.push(p);
    }
  }
  return kept;
}

/**
 * Distancia recorrida acumulando las distancias entre puntos consecutivos del
 * trayecto realizado (no es la distancia directa inicio→actual). Aplica el
 * mismo filtrado de ruido/saltos usado por cleanTrack.
 */
export function accumulatedDistanceKm(
  points: Coordinates[],
  options: TrackFilterOptions = {},
): number {
  const kept = cleanTrack(points, options);
  let total = 0;
  for (let i = 1; i < kept.length; i++) {
    total += haversineKm(kept[i - 1], kept[i]);
  }
  return total;
}

function projectOnSegmentKm(
  point: Coordinates,
  a: Coordinates,
  b: Coordinates,
): { distanceToLineKm: number; alongFromA: number; projection: Coordinates } {
  // Proyección en el plano local (ecorrectangular) sobre el segmento a→b.
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(midLat); // km por grado de longitud
  const ky = 110.574; // km por grado de latitud
  const ax = a.lng * kx;
  const ay = a.lat * ky;
  const bx = b.lng * kx;
  const by = b.lat * ky;
  const px = point.lng * kx;
  const py = point.lat * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const projection = { lat: (ay + t * dy) / ky, lng: (ax + t * dx) / kx };
  return {
    distanceToLineKm: haversineKm(point, projection),
    alongFromA: haversineKm(a, projection),
    projection,
  };
}

export interface PolylineProjection {
  nearestIndex: number;
  projection: Coordinates;
  /** Distancia recorrida sobre la polilínea desde el inicio hasta la proyección. */
  pathKmFromStart: number;
}

/** Proyección de un punto sobre una polilínea (segmento más cercano). */
export function projectOnPolyline(
  point: Coordinates,
  route: Coordinates[],
): PolylineProjection {
  if (route.length === 0) {
    return { nearestIndex: 0, projection: point, pathKmFromStart: 0 };
  }
  if (route.length === 1) {
    return { nearestIndex: 0, projection: route[0], pathKmFromStart: 0 };
  }
  let best = {
    nearestIndex: 0,
    projection: route[0],
    pathKmFromStart: 0,
    distance: Infinity,
  };
  let traveled = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const proj = projectOnSegmentKm(point, route[i], route[i + 1]);
    if (proj.distanceToLineKm < best.distance) {
      best = {
        nearestIndex: i,
        projection: proj.projection,
        pathKmFromStart: traveled + proj.alongFromA,
        distance: proj.distanceToLineKm,
      };
    }
    traveled += haversineKm(route[i], route[i + 1]);
  }
  return best;
}

/**
 * Distancia restante aproximada a lo largo del trazado: desde la posición actual
 * (proyectada sobre la ruta) hasta el final de la polilínea. No crea una API de
 * mapas nueva; es una aproximación geográfica sobre los waypoints conocidos.
 */
export function remainingDistanceToEndKm(
  position: Coordinates,
  route: Coordinates[],
): number {
  if (route.length === 0) return 0;
  if (route.length === 1) return haversineKm(position, route[0]);
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += haversineKm(route[i - 1], route[i]);
  }
  const pr = projectOnPolyline(position, route);
  return Math.max(0, total - pr.pathKmFromStart);
}

/** Indica si dos coordenadas están a menos de radiusM metros. */
export function isNearM(
  a: Coordinates,
  b: Coordinates,
  radiusM: number,
): boolean {
  return distanceM(a, b) <= radiusM;
}

/** Alias para compatibilidad con HU-08 (Cruz) */
export const haversineDistanceKm = haversineKm;
export const calculateTotalDistanceKm = accumulatedDistanceKm;

/** Calcula la velocidad en km/h a partir de distancia (km) y duración (segundos). */
export function calculateSpeedKmh(distanceKm: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || distanceKm <= 0) return 0;
  const hours = durationSeconds / 3600;
  return Math.round((distanceKm / hours) * 10) / 10;
}

/** Calcula el ritmo promedio en min/km (formato "mm:ss"). */
export function calculatePaceMinPerKm(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return "--:--";
  const paceSeconds = durationSeconds / distanceKm;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Calcula el desnivel acumulado (positivo y negativo) entre puntos con altitud. */
export function calculateElevationDeltaM(points: Coordinates[]): { gainM: number; lossM: number } {
  let gainM = 0;
  let lossM = 0;
  for (let i = 1; i < points.length; i++) {
    const prevAlt = points[i - 1].altitude;
    const currAlt = points[i].altitude;
    if (prevAlt != null && currAlt != null) {
      const delta = currAlt - prevAlt;
      if (delta > 0) gainM += delta;
      else lossM += Math.abs(delta);
    }
  }
  return { gainM: Math.round(gainM), lossM: Math.round(lossM) };
}
