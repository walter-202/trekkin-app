/**
 * IDs de rutas del seed propuesta (scripts/seed-routes-propuesta.mjs).
 * Sincronizar al añadir o quitar rutas del catálogo demo.
 */
export const SEED_ROUTE_IDS = [
  "route-takesi",
  "route-choro",
  "route-valle-animas",
  "route-condoriri",
  "route-unandes-ucb-obrajes",
] as const;

export type SeedRouteId = (typeof SEED_ROUTE_IDS)[number];

export function isSeedRouteId(routeId: string): routeId is SeedRouteId {
  return (SEED_ROUTE_IDS as readonly string[]).includes(routeId);
}
