/**
 * HU-04 C3/C4 — Calcular y exponer el tamaño estimado de una descarga.
 * Puro y determinista: usa los cálculos del dominio (sin I/O).
 */

import type { RouteModel } from "../../domain/types";
import { estimateRouteOfflineSize, type OfflineSizeEstimate } from "../../domain/offline";

/**
 * T3/T4 — Tamaño estimado de { mapa + trazado + información básica }
 * antes de confirmar la descarga. El resultado es desglosable por pieza.
 */
export function EstimateRouteDownloadSizeUseCase(
  route: RouteModel,
): OfflineSizeEstimate {
  return estimateRouteOfflineSize(route);
}