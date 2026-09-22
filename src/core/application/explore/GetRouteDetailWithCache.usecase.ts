import { z } from "zod";
import type { RouteModel } from "../../domain/types";
import { GetRouteDetailUseCase } from "./GetRouteDetail.usecase";

export interface GetRouteDetailWithCachePorts {
  getCached: (routeId: string) => Promise<RouteModel | null>;
  getById: (routeId: string) => Promise<RouteModel | null>;
  saveCached: (route: RouteModel) => Promise<void>;
}

export type RouteDetailSource = "cache" | "server";
export type RouteDetailUpdate = (route: RouteModel, source: RouteDetailSource) => void;

const RouteIdSchema = z.string().trim().min(1, "La ruta debe tener id").max(128);

/** Emits cached public detail immediately, then revalidates it from Firestore. */
export async function GetRouteDetailWithCacheUseCase(
  rawRouteId: string,
  ports: GetRouteDetailWithCachePorts,
  onUpdate: RouteDetailUpdate,
  onRefreshFailure: (error: unknown) => void,
): Promise<RouteModel> {
  const routeId = RouteIdSchema.parse(rawRouteId);
  let cached: RouteModel | null = null;
  try {
    cached = await ports.getCached(routeId);
  } catch {
    // A cache failure must not prevent the online detail request.
  }

  if (cached?.id === routeId && cached.status === "published") {
    onUpdate(cached, "cache");
  } else {
    cached = null;
  }

  try {
    const fresh = await GetRouteDetailUseCase(routeId, { getById: ports.getById });
    try {
      await ports.saveCached(fresh);
    } catch {
      // Persistence is opportunistic; the fresh server response remains usable.
    }
    onUpdate(fresh, "server");
    return fresh;
  } catch (error) {
    if (!cached) throw error;
    onRefreshFailure(error);
    return cached;
  }
}
