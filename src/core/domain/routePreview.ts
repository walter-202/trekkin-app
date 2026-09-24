import { simplifyTrack } from "./trackFormats";
import type { Coordinates, RoutePreview, RoutePreviewBounds } from "./types";

export const ROUTE_PREVIEW_VERSION = 1 as const;
export const ROUTE_PREVIEW_ENCODING = "polyline6" as const;
export const MAX_ROUTE_PREVIEW_POINT_COUNT = 200;
export const MAX_ROUTE_PREVIEW_ENCODED_LENGTH = 4_096;

function isValidCoordinate(point: Coordinates): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function toPreviewCoordinates(points: readonly Coordinates[]): Coordinates[] {
  return points.map((point) => {
    if (!isValidCoordinate(point)) {
      throw new Error("Route preview coordinates must be finite latitude/longitude values.");
    }
    return { lat: point.lat, lng: point.lng };
  });
}

function assertPointLimit(maxPointCount: number): void {
  if (
    !Number.isInteger(maxPointCount) ||
    maxPointCount < 2 ||
    maxPointCount > MAX_ROUTE_PREVIEW_POINT_COUNT
  ) {
    throw new Error(
      `Route preview point limit must be an integer between 2 and ${MAX_ROUTE_PREVIEW_POINT_COUNT}.`,
    );
  }
}

function sampleEvenly(points: readonly Coordinates[], maxPointCount: number): Coordinates[] {
  if (points.length <= maxPointCount) {
    return [...points];
  }

  const sampled: Coordinates[] = [];
  const lastIndex = points.length - 1;
  for (let index = 0; index < maxPointCount; index += 1) {
    const sourceIndex = Math.round((index * lastIndex) / (maxPointCount - 1));
    sampled.push(points[sourceIndex]);
  }
  return sampled;
}

/**
 * Reduces a route to a deterministic, display-only point set while retaining its endpoints.
 * Ramer-Douglas-Peucker handles ordinary tracks; even sampling is the hard upper bound.
 */
export function simplifyRoutePreview(
  points: readonly Coordinates[],
  maxPointCount: number = MAX_ROUTE_PREVIEW_POINT_COUNT,
): Coordinates[] {
  assertPointLimit(maxPointCount);
  const normalized = toPreviewCoordinates(points);

  if (normalized.length < 2) {
    throw new Error("A route preview requires at least two coordinates.");
  }
  if (normalized.length <= maxPointCount) {
    return normalized;
  }

  let simplified = normalized;
  let toleranceMeters = 2;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = simplifyTrack(normalized, toleranceMeters);
    simplified = candidate;
    if (candidate.length <= maxPointCount) {
      return candidate;
    }
    toleranceMeters *= 2;
  }

  return sampleEvenly(simplified, maxPointCount);
}

/** Computes the exact bounds of the geometry encoded in a route preview. */
export function routePreviewBounds(points: readonly Coordinates[]): RoutePreviewBounds {
  const normalized = toPreviewCoordinates(points);
  if (normalized.length === 0) {
    throw new Error("A route preview bounding box requires at least one coordinate.");
  }

  let minLat = normalized[0].lat;
  let maxLat = normalized[0].lat;
  let minLng = normalized[0].lng;
  let maxLng = normalized[0].lng;

  for (let index = 1; index < normalized.length; index += 1) {
    const point = normalized[index];
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  return { minLat, minLng, maxLat, maxLng };
}

function encodeCoordinateDelta(delta: number): string {
  let value = delta < 0 ? -(delta * 2) - 1 : delta * 2;
  let encoded = "";

  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value = Math.floor(value / 32);
  }
  return encoded + String.fromCharCode(value + 63);
}

/** Encodes latitude/longitude coordinates with Google's six-decimal polyline format. */
export function encodePolyline6(points: readonly Coordinates[]): string {
  const normalized = toPreviewCoordinates(points);
  let previousLat = 0;
  let previousLng = 0;
  let encoded = "";

  for (const point of normalized) {
    const lat = Math.round(point.lat * 1_000_000);
    const lng = Math.round(point.lng * 1_000_000);
    encoded += encodeCoordinateDelta(lat - previousLat);
    encoded += encodeCoordinateDelta(lng - previousLng);
    previousLat = lat;
    previousLng = lng;
  }

  if (encoded.length > MAX_ROUTE_PREVIEW_ENCODED_LENGTH) {
    throw new Error("Route preview polyline exceeds the encoded size limit.");
  }
  return encoded;
}

function decodeCoordinateDelta(encoded: string, state: { index: number }): number {
  let value = 0;
  let shift = 0;

  while (true) {
    if (state.index >= encoded.length) {
      throw new Error("Route preview polyline is incomplete.");
    }
    const chunk = encoded.charCodeAt(state.index) - 63;
    state.index += 1;
    if (chunk < 0 || chunk > 0x3f) {
      throw new Error("Route preview polyline contains an invalid character.");
    }

    value += (chunk & 0x1f) * 2 ** shift;
    if ((chunk & 0x20) === 0) {
      return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
    }
    shift += 5;
    if (shift > 30) {
      throw new Error("Route preview polyline contains an invalid coordinate.");
    }
  }
}

/** Decodes a bounded polyline6 payload and rejects data that exceeds the display contract. */
export function decodePolyline6(
  encoded: string,
  maxPointCount: number = MAX_ROUTE_PREVIEW_POINT_COUNT,
): Coordinates[] {
  assertPointLimit(maxPointCount);
  if (encoded.length === 0 || encoded.length > MAX_ROUTE_PREVIEW_ENCODED_LENGTH) {
    throw new Error("Route preview polyline is outside the encoded size limit.");
  }

  const state = { index: 0 };
  const points: Coordinates[] = [];
  let lat = 0;
  let lng = 0;

  while (state.index < encoded.length) {
    lat += decodeCoordinateDelta(encoded, state);
    lng += decodeCoordinateDelta(encoded, state);
    const point = { lat: lat / 1_000_000, lng: lng / 1_000_000 };
    if (!isValidCoordinate(point)) {
      throw new Error("Route preview polyline contains an out-of-range coordinate.");
    }
    points.push(point);
    if (points.length > maxPointCount) {
      throw new Error("Route preview polyline exceeds the point limit.");
    }
  }

  return points;
}

/** Builds the versioned, bounded geometry sent with a published route detail. */
export function buildRoutePreview(
  points: readonly Coordinates[],
  maxPointCount: number = MAX_ROUTE_PREVIEW_POINT_COUNT,
): RoutePreview {
  const previewPoints = simplifyRoutePreview(points, maxPointCount);
  const polyline = encodePolyline6(previewPoints);
  // Bounds must describe the quantized bytes that MapLibre will decode, not source precision.
  const encodedPoints = decodePolyline6(polyline, maxPointCount);
  return {
    version: ROUTE_PREVIEW_VERSION,
    encoding: ROUTE_PREVIEW_ENCODING,
    polyline,
    pointCount: encodedPoints.length,
    bbox: routePreviewBounds(encodedPoints),
  };
}
