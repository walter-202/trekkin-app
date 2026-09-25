/**
 * Protomaps / PMTiles — utilidades de dominio puro (sin I/O).
 * @see https://docs.protomaps.com/pmtiles/cli#extract
 */

import type { Coordinates, RouteModel } from "./types";
import { computeBoundingBox, type GeoBounds } from "./geoBounds";

/** Build diario recomendado (actualizar al publicar rutas nuevas). */
export const DEFAULT_PROTOMAPS_PLANET_BUILD = "20251229";

export const DEFAULT_PROTOMAPS_PLANET_URL = `https://build.protomaps.com/${DEFAULT_PROTOMAPS_PLANET_BUILD}.pmtiles`;

export interface ProtomapsExtractOptions {
  minZoom?: number;
  maxZoom?: number;
  paddingFraction?: number;
}

/** Bbox `west,south,east,north` para `pmtiles extract --bbox=`. */
export function formatProtomapsBbox(bounds: GeoBounds): string {
  return `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
}

/** Puntos de la ruta con margen para el extract regional. */
export function routeBasemapPoints(route: RouteModel): Coordinates[] {
  const pts: Coordinates[] = [];
  if (route.waypoints.length >= 2) {
    pts.push(...route.waypoints);
  } else {
    pts.push(
      { lat: route.startPoint.lat, lng: route.startPoint.lng },
      { lat: route.endPoint.lat, lng: route.endPoint.lng },
    );
  }
  for (const cp of route.checkpoints) {
    pts.push({ lat: cp.lat, lng: cp.lng });
  }
  return pts;
}

export function routeBasemapBounds(
  route: RouteModel,
  options: ProtomapsExtractOptions = {},
): GeoBounds {
  return computeBoundingBox(
    routeBasemapPoints(route),
    options.paddingFraction ?? 0.2,
  );
}

/** Comando `pmtiles extract` documentado para CI / scripts. */
export function buildProtomapsExtractCommand(
  route: RouteModel,
  outputPath: string,
  planetUrl: string = DEFAULT_PROTOMAPS_PLANET_URL,
  options: ProtomapsExtractOptions = {},
): string {
  const bbox = formatProtomapsBbox(routeBasemapBounds(route, options));
  const minZoom = options.minZoom ?? 0;
  const maxZoom = options.maxZoom ?? 16;
  return `pmtiles extract ${planetUrl} ${outputPath} --bbox=${bbox} --minzoom=${minZoom} --maxzoom=${maxZoom}`;
}
