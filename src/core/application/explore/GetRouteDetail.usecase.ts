import { z } from "zod";
import type { RouteModel } from "../../domain/types";

/**
 * HU-03 C6 — Obtener detalle de ruta por id.
 * Solo expone rutas publicadas (catálogo público/aprobado).
 */
export interface GetRouteDetailPorts {
  getById: (id: string) => Promise<RouteModel | null>;
}

const RouteIdSchema = z
  .string()
  .trim()
  .min(1, "La ruta debe tener id")
  .max(128);

export async function GetRouteDetailUseCase(
  rawId: string,
  ports: GetRouteDetailPorts,
): Promise<RouteModel> {
  const id = RouteIdSchema.parse(rawId);
  const route = await ports.getById(id);
  if (!route) throw new Error("Ruta no encontrada.");
  if (route.status !== "published")
    throw new Error("Ruta no disponible (no publicada).");
  return route;
}
