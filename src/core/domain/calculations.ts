import type { Coordinates, RouteDifficulty } from './types';

/**
 * Clean Architecture — Dominio Cálculos y Métricas GPS (HU-08).
 * 100% TypeScript puro, sin dependencias de React Native, Expo ni Firebase.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calcula la distancia ortodrómica en kilómetros entre dos coordenadas
 * geográficas utilizando la fórmula de Haversine.
 * Precisión redondeada a 3 decimales (metros).
 */
export function haversineDistanceKm(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) {
    return 0;
  }

  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const lat1Rad = (p1.lat * Math.PI) / 180;
  const lat2Rad = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 1000) / 1000;
}

/**
 * Suma las distancias de cada segmento consecutivo en un trazado GPS.
 */
export function calculateTrackDistanceKm(
  points: Array<{ lat: number; lng: number }>
): number {
  if (!points || points.length < 2) {
    return 0;
  }

  let totalKm = 0;
  for (let i = 1; i < points.length; i++) {
    totalKm += haversineDistanceKm(points[i - 1], points[i]);
  }

  return Math.round(totalKm * 1000) / 1000;
}

/**
 * Calcula la distancia restante directa en kilómetros hacia el destino.
 */
export function calculateRemainingDistanceKm(
  current: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number } | null | undefined
): number {
  if (!current || !destination) {
    return 0;
  }
  return haversineDistanceKm(current, destination);
}

/**
 * Calcula el ritmo medio en minutos por kilómetro.
 */
export function calculatePaceMinPerKm(
  distanceKm: number,
  durationSeconds: number
): number {
  if (distanceKm <= 0 || durationSeconds <= 0) {
    return 0;
  }
  const minutes = durationSeconds / 60;
  const pace = minutes / distanceKm;
  return Math.round(pace * 100) / 100;
}

/**
 * Calcula la velocidad promedio en km/h.
 */
export function calculateAverageSpeedKmh(
  distanceKm: number,
  durationSeconds: number
): number {
  if (distanceKm <= 0 || durationSeconds <= 0) {
    return 0;
  }
  const hours = durationSeconds / 3600;
  const speed = distanceKm / hours;
  return Math.round(speed * 100) / 100;
}

/**
 * Sugiere la dificultad de la ruta en base a la distancia recorrida
 * y opcionalmente el desnivel positivo acumulado (estándar senderismo andino).
 */
export function suggestRouteDifficulty(
  distanceKm: number,
  elevationGainM?: number
): RouteDifficulty {
  const gain = elevationGainM ?? 0;

  if (distanceKm >= 20 || gain >= 1200) {
    return 'experto';
  }
  if (distanceKm >= 12 || gain >= 700) {
    return 'dificil';
  }
  if (distanceKm >= 5 || gain >= 250) {
    return 'moderado';
  }
  return 'facil';
}

/**
 * Formatea duración en segundos a string legible HH:MM:SS o MM:SS.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Formatea ritmo minutos/km a formato legible MM'SS"/km.
 */
export function formatPace(paceMinPerKm: number): string {
  if (paceMinPerKm <= 0 || !Number.isFinite(paceMinPerKm)) {
    return "--'--\"/km";
  }
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(mins)}'${pad(secs)}" /km`;
}
