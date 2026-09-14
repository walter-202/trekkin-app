import {
  RouteFiltersSchema,
  type RouteFilters,
} from "../../domain/route.schemas";
import type { RouteModel } from "../../domain/types";

/**
 * HU-03 C3/C4 — Buscar/filtrar rutas publicadas según criterios.
 * Puro: valida filtros con Zod y filtra en memoria sobre el catálogo
 * publicado (evita índices compuestos en Firestore).
 */
export interface SearchRoutesPorts {
  listPublished: () => Promise<RouteModel[]>;
}

function matchesTexto(route: RouteModel, texto: string): boolean {
  const q = texto.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    route.title,
    route.description,
    route.region,
    route.startPoint?.name,
    route.endPoint?.name,
    route.creatorName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export async function SearchRoutesUseCase(
  rawFilters: Partial<RouteFilters>,
  ports: SearchRoutesPorts,
): Promise<RouteModel[]> {
  const filters = RouteFiltersSchema.parse({
    texto: rawFilters.texto ?? "",
    dificultad: rawFilters.dificultad,
    distanciaMinKm: rawFilters.distanciaMinKm,
    distanciaMaxKm: rawFilters.distanciaMaxKm,
    region: rawFilters.region,
    modalidad: rawFilters.modalidad,
  });

  const all = await ports.listPublished();

  return all.filter((route) => {
    if (route.status !== "published") return false;
    if (filters.dificultad && route.difficulty !== filters.dificultad)
      return false;
    if (
      filters.distanciaMinKm !== undefined &&
      route.distanceKm < filters.distanciaMinKm
    )
      return false;
    if (
      filters.distanciaMaxKm !== undefined &&
      route.distanceKm > filters.distanciaMaxKm
    )
      return false;
    if (
      filters.region &&
      !route.region.toLowerCase().includes(filters.region.trim().toLowerCase())
    )
      return false;
    if (filters.modalidad && route.modality !== filters.modalidad) return false;
    if (!matchesTexto(route, filters.texto)) return false;
    return true;
  });
}
