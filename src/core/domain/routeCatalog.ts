import { RoutePreviewSchema } from "./routePreview.schemas";
import type { RoutePreview } from "./types";

/** Accepts legacy catalog documents while validating any migrated online preview. */
export function parseOptionalRoutePreview(value: unknown): RoutePreview | undefined {
  return value === undefined ? undefined : RoutePreviewSchema.parse(value);
}
