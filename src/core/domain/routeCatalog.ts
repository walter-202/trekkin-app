import { RoutePreviewSchema } from "./routePreview.schemas";
import type { RoutePreview } from "./types";

/** Accepts legacy catalog documents while validating any migrated online preview. */
export function parseOptionalRoutePreview(value: unknown): RoutePreview | undefined {
  return value === undefined ? undefined : RoutePreviewSchema.parse(value);
}

/**
 * Etiqueta de modalidad sugerida para la tarjeta resumen (RF-07).
 * `routeService` propaga el documento Firestore tal cual, así que rutas
 * legacy sin `modality` llegan como `undefined` en runtime aunque el tipo la
 * declare requerida: en ese caso se muestra el fallback explícito en vez de
 * asumir un valor.
 */
export function formatModalityLabel(modality: unknown): string {
  if (modality === "solo") return "Solo";
  if (modality === "acompañado") return "Acompañado";
  return "Modalidad no especificada";
}
