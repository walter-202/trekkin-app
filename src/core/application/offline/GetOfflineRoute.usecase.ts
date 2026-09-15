/**
 * HU-04 T12 — Abrir una ruta descargada para consultarla sin Internet.
 * Solo lectura del repositorio local: no toca red.
 */

import type { OfflineRoute } from "../../domain/offline";
import {
  OfflineRouteIdSchema,
  OfflineRouteSchema,
} from "../../domain/offline.schemas";

export interface GetOfflineRoutePorts {
  get: (routeId: string) => Promise<OfflineRoute | null>;
}

export async function GetOfflineRouteUseCase(
  rawRouteId: string,
  ports: GetOfflineRoutePorts,
): Promise<OfflineRoute> {
  const routeId = OfflineRouteIdSchema.parse(rawRouteId);
  const record = await ports.get(routeId);
  if (!record) throw new Error("Esta ruta aún no está descargada.");
  const parsed = OfflineRouteSchema.parse(record);
  return parsed;
}