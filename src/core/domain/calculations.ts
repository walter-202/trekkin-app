import type { Coordinates, RouteDifficulty } from "./types";

/**
 * Cálculos geográficos y métricas GPS.
 * Funciones puras, sin dependencias de React Native, Expo ni Firebase.
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia geográfica en kilómetros entre dos coordenadas. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  if (a.lat === b.lat && a.lng === b.lng) {
    return 0;
  }

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) *
      Math.cos(la2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Alias utilizado por HU-08. */
export const haversineDistanceKm = haversineKm;

/** Distancia en metros entre dos coordenadas. */
export function distanceM(a: Coordinates, b: Coordinates): number {
  return haversineKm(a, b) * 1000;
}

/**
 * Suma las distancias de cada segmento consecutivo.
 */
export function calculateTrackDistanceKm(
  points: Array<{ lat: number; lng: number }>,
): number {
  if (!points || points.length < 2) {
    return 0;
  }

  let totalKm = 0;

  for (let i = 1; i < points.length; i++) {
    totalKm += haversineKm(points[i - 1], points[i]);
  }

  return Math.round(totalKm * 1000) / 1000;
}

/**
 * Alias compatible con la arquitectura nueva.
 */
export const calculateTotalDistanceKm = calculateTrackDistanceKm;

/** Distancia directa restante hacia el destino. */
export function calculateRemainingDistanceKm(
  current: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number } | null | undefined,
): number {
  if (!current || !destination) {
    return 0;
  }

  return haversineDistanceKm(current, destination);
}

export interface TrackFilterOptions {
  minDeltaM?: number;
  maxJumpM?: number;
}

/**
 * Filtra ruido GPS y saltos demasiado grandes.
 */
export function cleanTrack(
  points: Coordinates[],
  options: TrackFilterOptions = {},
): Coordinates[] {
  const minDeltaM = options.minDeltaM ?? 0;
  const maxJumpM = options.maxJumpM ?? Infinity;

  const kept: Coordinates[] = [];

  for (const point of points) {
    if (kept.length === 0) {
      kept.push(point);
      continue;
    }

    const last = kept[kept.length - 1];
    const distance = distanceM(last, point);

    if (distance >= minDeltaM && distance <= maxJumpM) {
      kept.push(point);
    }
  }

  return kept;
}

/**
 * Distancia acumulada sobre un trazado GPS.
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

/**
 * Ritmo medio en minutos por kilómetro.
 *
 * Se mantiene como número porque HU-08 y sus vistas actuales
 * utilizan este valor para calcular/formatear el ritmo.
 */
export function calculatePaceMinPerKm(
  distanceKm: number,
  durationSeconds: number,
): number {
  if (distanceKm <= 0 || durationSeconds <= 0) {
    return 0;
  }

  const minutes = durationSeconds / 60;
  const pace = minutes / distanceKm;

  return Math.round(pace * 100) / 100;
}

/** Velocidad promedio en km/h. */
export function calculateAverageSpeedKmh(
  distanceKm: number,
  durationSeconds: number,
): number {
  if (distanceKm <= 0 || durationSeconds <= 0) {
    return 0;
  }

  const hours = durationSeconds / 3600;
  const speed = distanceKm / hours;

  return Math.round(speed * 100) / 100;
}

/**
 * Velocidad promedio con el formato utilizado por la arquitectura nueva.
 */
export function calculateSpeedKmh(
  distanceKm: number,
  durationSeconds: number,
): number {
  if (distanceKm <= 0 || durationSeconds <= 0) {
    return 0;
  }

  const hours = durationSeconds / 3600;

  return Math.round((distanceKm / hours) * 10) / 10;
}

/**
 * Proyección de un punto sobre un segmento de la ruta.
 */
function projectOnSegmentKm(
  point: Coordinates,
  a: Coordinates,
  b: Coordinates,
): {
  distanceToLineKm: number;
  alongFromA: number;
  projection: Coordinates;
} {
  const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(midLat);
  const ky = 110.574;

  const ax = a.lng * kx;
  const ay = a.lat * ky;
  const bx = b.lng * kx;
  const by = b.lat * ky;
  const px = point.lng * kx;
  const py = point.lat * ky;

  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;

  let t =
    len2 > 0
      ? ((px - ax) * dx + (py - ay) * dy) / len2
      : 0;

  t = Math.max(0, Math.min(1, t));

  const projection = {
    lat: (ay + t * dy) / ky,
    lng: (ax + t * dx) / kx,
  };

  return {
    distanceToLineKm: haversineKm(point, projection),
    alongFromA: haversineKm(a, projection),
    projection,
  };
}

export interface PolylineProjection {
  nearestIndex: number;
  projection: Coordinates;
  pathKmFromStart: number;
}

/** Proyección de un punto sobre una polilínea. */
export function projectOnPolyline(
  point: Coordinates,
  route: Coordinates[],
): PolylineProjection {
  if (route.length === 0) {
    return {
      nearestIndex: 0,
      projection: point,
      pathKmFromStart: 0,
    };
  }

  if (route.length === 1) {
    return {
      nearestIndex: 0,
      projection: route[0],
      pathKmFromStart: 0,
    };
  }

  let best = {
    nearestIndex: 0,
    projection: route[0],
    pathKmFromStart: 0,
    distance: Infinity,
  };

  let traveled = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const projection = projectOnSegmentKm(
      point,
      route[i],
      route[i + 1],
    );

    if (projection.distanceToLineKm < best.distance) {
      best = {
        nearestIndex: i,
        projection: projection.projection,
        pathKmFromStart:
          traveled + projection.alongFromA,
        distance: projection.distanceToLineKm,
      };
    }

    traveled += haversineKm(route[i], route[i + 1]);
  }

  return best;
}

/**
 * Distancia restante siguiendo aproximadamente el trazado.
 */
export function remainingDistanceToEndKm(
  position: Coordinates,
  route: Coordinates[],
): number {
  if (route.length === 0) {
    return 0;
  }

  if (route.length === 1) {
    return haversineKm(position, route[0]);
  }

  let total = 0;

  for (let i = 1; i < route.length; i++) {
    total += haversineKm(route[i - 1], route[i]);
  }

  const projection = projectOnPolyline(position, route);

  return Math.max(
    0,
    total - projection.pathKmFromStart,
  );
}

/** Comprueba si dos puntos están dentro de un radio determinado. */
export function isNearM(
  a: Coordinates,
  b: Coordinates,
  radiusM: number,
): boolean {
  return distanceM(a, b) <= radiusM;
}

/**
 * Sugiere dificultad según distancia y desnivel positivo.
 * Se conserva para HU-08 y ActivitySummaryView.
 */
export function suggestRouteDifficulty(
  distanceKm: number,
  elevationGainM?: number,
): RouteDifficulty {
  const gain = elevationGainM ?? 0;

  if (distanceKm >= 20 || gain >= 1200) {
    return "experto";
  }

  if (distanceKm >= 12 || gain >= 700) {
    return "dificil";
  }

  if (distanceKm >= 5 || gain >= 250) {
    return "moderado";
  }

  return "facil";
}

/** Calcula desnivel positivo y negativo acumulado. */
export function calculateElevationDeltaM(
  points: Coordinates[],
): { gainM: number; lossM: number } {
  let gainM = 0;
  let lossM = 0;

  for (let i = 1; i < points.length; i++) {
    const previousAltitude = points[i - 1].altitude;
    const currentAltitude = points[i].altitude;

    if (
      previousAltitude != null &&
      currentAltitude != null
    ) {
      const delta =
        currentAltitude - previousAltitude;

      if (delta > 0) {
        gainM += delta;
      } else {
        lossM += Math.abs(delta);
      }
    }
  }

  return {
    gainM: Math.round(gainM),
    lossM: Math.round(lossM),
  };
}