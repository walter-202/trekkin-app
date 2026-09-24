import type { RouteModel } from "../../domain/types";
import { sortPublishedRoutes } from "./ListPublishedRoutes.usecase";

export interface PublishedRoutesPage {
  routes: RouteModel[];
  lastVisible: unknown | null;
  hasMore: boolean;
}

export interface ListPublishedRoutesPaginatedPorts {
  listPublishedPage: (
    pageSize: number,
    lastVisible?: unknown,
  ) => Promise<PublishedRoutesPage>;
}

/** Fetches one cursor page without coupling the application layer to Firestore snapshots. */
export async function ListPublishedRoutesPaginatedUseCase(
  pageSize: number,
  lastVisible: unknown | undefined,
  ports: ListPublishedRoutesPaginatedPorts,
): Promise<PublishedRoutesPage> {
  const page = await ports.listPublishedPage(pageSize, lastVisible);
  return { ...page, routes: sortPublishedRoutes(page.routes) };
}

/** Merges cursor pages defensively in case a retried request repeats a document. */
export function mergePublishedRoutePages(
  current: readonly RouteModel[],
  next: readonly RouteModel[],
): RouteModel[] {
  const routesById = new Map<string, RouteModel>();
  for (const route of [...current, ...next]) {
    routesById.set(route.id, route);
  }
  return sortPublishedRoutes([...routesById.values()]);
}
