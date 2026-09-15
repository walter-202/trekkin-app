/**
 * HU-04 T12 — Listar rutas descargadas en el dispositivo.
 * Consulta pura sobre el repositorio local (funciona sin Internet).
 */

import type { OfflineRoute } from "../../domain/offline";
import { OfflineRouteSchema } from "../../domain/offline.schemas";

export interface ListOfflineRoutesPorts {
  list: () => Promise<OfflineRoute[]>;
}

/**
 * Lista descargas válidas, ordenadas por fecha de descarga (más recientes
 * primero). Registros corruptos se saltan (integridad) sin romper la lista.
 */
export async function ListOfflineRoutesUseCase(
  ports: ListOfflineRoutesPorts,
): Promise<OfflineRoute[]> {
  const records = await ports.list();
  return records
    .map((r) => {
      const parsed = OfflineRouteSchema.safeParse(r);
      return parsed.success ? parsed.data : null;
    })
    .filter((r): r is OfflineRoute => r !== null)
    .sort((a, b) => b.downloadedAt - a.downloadedAt);
}