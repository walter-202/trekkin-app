import type { RouteModel } from "../../domain/types";

/**
 * HU-03 C2 — Listar catálogo público/aprobado.
 * Puro: recibe el puerto, no importa Firebase.
 */
export interface ListPublishedRoutesPorts {
  listPublished: () => Promise<RouteModel[]>;
}

/** Mirrors the Firestore cursor order when a consumer sorts loaded catalog pages in memory. */
export function sortPublishedRoutes(routes: readonly RouteModel[]): RouteModel[] {
  return [...routes].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.id.localeCompare(b.id),
  );
}

export async function ListPublishedRoutesUseCase(
  ports: ListPublishedRoutesPorts,
): Promise<RouteModel[]> {
  const routes = await ports.listPublished();
  return sortPublishedRoutes(routes);
}
