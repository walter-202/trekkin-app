import { ValidateRoutePublicationUseCase } from "../route/PublishRoute.usecase";
import { decodePolyline6, simplifyRoutePreview } from "../../domain/routePreview";
import { RoutePreviewSchema } from "../../domain/routePreview.schemas";
import type { Coordinates, RouteModel } from "../../domain/types";

export type RouteDownloadBlockReason =
  | "authentication_required"
  | "route_not_published"
  | "artifacts_unavailable";

export type RouteDownloadAvailability =
  | { available: true }
  | { available: false; reason: RouteDownloadBlockReason };

/** Prefer compact published geometry; retain a fallback for unmigrated legacy routes. */
export function GetRoutePreviewPointsUseCase(route: RouteModel): Coordinates[] {
  if (!route.preview) {
    return route.waypoints.length < 2 ? route.waypoints : simplifyRoutePreview(route.waypoints);
  }
  const preview = RoutePreviewSchema.parse(route.preview);
  return decodePolyline6(preview.polyline);
}

/** Only authenticated users with a fully uploaded, version-matched pair can start HU-04. */
export function CheckRouteDownloadAvailabilityUseCase(
  route: RouteModel,
  isAuthenticated: boolean,
): RouteDownloadAvailability {
  if (!isAuthenticated) return { available: false, reason: "authentication_required" };
  if (route.status !== "published") return { available: false, reason: "route_not_published" };
  if (!route.artifacts) return { available: false, reason: "artifacts_unavailable" };

  try {
    ValidateRoutePublicationUseCase(route.id, route.artifacts);
    return { available: true };
  } catch {
    return { available: false, reason: "artifacts_unavailable" };
  }
}
