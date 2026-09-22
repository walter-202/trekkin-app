import { z } from "zod";
import { RouteSchema } from "../../domain/route.schemas";
import { simplifyRoutePreview } from "../../domain/routePreview";
import type { RouteModel } from "../../domain/types";

const CACHE_PREFIX = "trekkin:route-detail:v1";
const ROUTE_INDEX_KEY = `${CACHE_PREFIX}:ids`;
const MAX_CACHED_ROUTE_DETAILS = 30;

const CacheEntrySchema = z.object({
  routeId: z.string().min(1).max(128),
  cacheKey: z.string().min(1),
  cachedAt: z.number().nonnegative(),
  route: RouteSchema,
}).strict();

export interface RouteDetailCacheStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function routePrefix(routeId: string): string {
  return `${CACHE_PREFIX}:${encodeURIComponent(routeId)}`;
}

function hash(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function compactRoute(route: RouteModel): RouteModel {
  const validated = RouteSchema.parse(route);
  return {
    ...validated,
    // Published preview is sufficient online geometry; cap legacy geometry too.
    waypoints: validated.preview
      ? []
      : validated.waypoints.length < 2
        ? validated.waypoints
        : simplifyRoutePreview(validated.waypoints),
  };
}

function keyForRoute(route: RouteModel): string {
  const identity = route.preview
    ? `preview-v${route.preview.version}-${hash(route.preview.polyline)}`
    : `legacy-${hash(JSON.stringify(route.waypoints))}`;
  return `${routePrefix(route.id)}:${identity}`;
}

async function readRouteIds(storage: RouteDetailCacheStorage): Promise<string[]> {
  const raw = await storage.getItem(ROUTE_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && id.length <= 128)
      : [];
  } catch {
    return [];
  }
}

async function removeCachedRoute(storage: RouteDetailCacheStorage, routeId: string): Promise<void> {
  const pointerKey = `${routePrefix(routeId)}:active`;
  const activeKey = await storage.getItem(pointerKey);
  await storage.removeItem(pointerKey);
  if (activeKey?.startsWith(`${routePrefix(routeId)}:`)) {
    await storage.removeItem(activeKey);
  }
}

/** Creates a bounded local cache keyed by route ID and preview version/geometry fingerprint. */
export function CreateRouteDetailCacheRepository(
  storage: RouteDetailCacheStorage,
  now: () => number = Date.now,
) {
  return {
    async get(routeId: string): Promise<RouteModel | null> {
      const prefix = routePrefix(routeId);
      const activeKey = await storage.getItem(`${prefix}:active`);
      if (!activeKey?.startsWith(`${prefix}:`)) return null;

      const raw = await storage.getItem(activeKey);
      if (!raw) return null;
      try {
        const entry = CacheEntrySchema.parse(JSON.parse(raw));
        const route = compactRoute(entry.route as RouteModel);
        if (
          entry.routeId !== routeId ||
          route.id !== routeId ||
          entry.cacheKey !== activeKey ||
          keyForRoute(route) !== activeKey ||
          route.status !== "published"
        ) {
          await removeCachedRoute(storage, routeId);
          return null;
        }
        const ids = await readRouteIds(storage);
        await storage.setItem(ROUTE_INDEX_KEY, JSON.stringify([routeId, ...ids.filter((id) => id !== routeId)].slice(0, MAX_CACHED_ROUTE_DETAILS)));
        return route;
      } catch {
        await removeCachedRoute(storage, routeId);
        return null;
      }
    },

    async save(rawRoute: RouteModel): Promise<void> {
      const route = compactRoute(rawRoute);
      if (route.status !== "published") return;

      const prefix = routePrefix(route.id);
      const pointerKey = `${prefix}:active`;
      const cacheKey = keyForRoute(route);
      const previousKey = await storage.getItem(pointerKey);
      const entry = CacheEntrySchema.parse({
        routeId: route.id,
        cacheKey,
        cachedAt: now(),
        route,
      });

      // Commit data before its pointer so an interrupted write leaves the old cache readable.
      await storage.setItem(cacheKey, JSON.stringify(entry));
      await storage.setItem(pointerKey, cacheKey);
      const ids = await readRouteIds(storage);
      const nextIds = [route.id, ...ids.filter((id) => id !== route.id)].slice(0, MAX_CACHED_ROUTE_DETAILS);
      await storage.setItem(ROUTE_INDEX_KEY, JSON.stringify(nextIds));

      if (previousKey && previousKey !== cacheKey && previousKey.startsWith(`${prefix}:`)) {
        await storage.removeItem(previousKey);
      }
      for (const evictedId of ids) {
        if (!nextIds.includes(evictedId)) await removeCachedRoute(storage, evictedId);
      }
    },
  };
}
