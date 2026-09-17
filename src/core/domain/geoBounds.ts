import type { Coordinates } from "./types";

export interface GeoBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapRegionCalculated {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const DEFAULT_BOLIVIA_REGION: MapRegionCalculated = {
  latitude: -16.499,
  longitude: -68.146,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

/**
 * Computes the bounding box [minLng, minLat, maxLng, maxLat] with an optional safety margin.
 */
export function computeBoundingBox(
  points: Coordinates[],
  paddingFraction: number = 0.15
): GeoBounds {
  if (!points || points.length === 0) {
    return {
      minLng: -68.25,
      minLat: -16.55,
      maxLng: -68.05,
      maxLat: -16.45,
    };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const latDelta = Math.max(maxLat - minLat, 0.005);
  const lngDelta = Math.max(maxLng - minLng, 0.005);

  const latPadding = latDelta * paddingFraction;
  const lngPadding = lngDelta * paddingFraction;

  return {
    minLng: minLng - lngPadding,
    minLat: minLat - latPadding,
    maxLng: maxLng + lngPadding,
    maxLat: maxLat + latPadding,
  };
}

/**
 * Converts a bounding box to a camera region (lat/lng + deltas).
 */
export function boundsToRegion(bounds: GeoBounds): MapRegionCalculated {
  const latitude = (bounds.minLat + bounds.maxLat) / 2;
  const longitude = (bounds.minLng + bounds.maxLng) / 2;
  const latitudeDelta = Math.max(Math.abs(bounds.maxLat - bounds.minLat), 0.01);
  const longitudeDelta = Math.max(Math.abs(bounds.maxLng - bounds.minLng), 0.01);

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

/**
 * Calculates tile count for standard slippy map tiles within a bounding box.
 */
export function estimateTileCount(
  bounds: GeoBounds,
  minZoom: number = 12,
  maxZoom: number = 15
): number {
  let totalTiles = 0;

  for (let z = minZoom; z <= maxZoom; z++) {
    const n = Math.pow(2, z);
    const minX = Math.floor(((bounds.minLng + 180) / 360) * n);
    const maxX = Math.floor(((bounds.maxLng + 180) / 360) * n);

    const latRadMin = (bounds.minLat * Math.PI) / 180;
    const latRadMax = (bounds.maxLat * Math.PI) / 180;

    const maxY = Math.floor(
      (1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2 * n
    );
    const minY = Math.floor(
      (1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2 * n
    );

    const xTiles = Math.max(0, maxX - minX + 1);
    const yTiles = Math.max(0, maxY - minY + 1);
    totalTiles += xTiles * yTiles;
  }

  return totalTiles;
}

/**
 * Estimates download size in MB based on average raster/vector tile byte size.
 * Raster PNG: ~25 KB / tile
 * Vector PBF: ~35 KB / tile
 */
export function estimateDownloadSizeMB(
  tileCount: number,
  averageTileBytes: number = 25 * 1024
): number {
  const bytes = tileCount * averageTileBytes;
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

export { DEFAULT_BOLIVIA_REGION };
