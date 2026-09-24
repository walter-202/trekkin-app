import assert from "node:assert/strict";
import { CreateRouteDetailCacheRepository } from "../core/application/explore/RouteDetailCacheRepository";
import { GetRouteDetailWithCacheUseCase } from "../core/application/explore/GetRouteDetailWithCache.usecase";
import { buildRoutePreview } from "../core/domain/routePreview";
import type { RouteModel } from "../core/domain/types";

const memory = () => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
    removeItem: async (key: string) => { values.delete(key); },
  };
};

const route = (id: string, offset = 0, title = "Cached route"): RouteModel => {
  const points = [
    { lat: -16.5 + offset, lng: -68.1 },
    { lat: -16.505 + offset, lng: -68.105 },
    { lat: -16.51 + offset, lng: -68.11 },
  ];
  return {
    id, title, description: "Public route metadata", region: "La Paz",
    startPoint: { name: "Start", lat: points[0].lat, lng: points[0].lng },
    endPoint: { name: "End", lat: points[2].lat, lng: points[2].lng },
    distanceKm: 2, durationMinutes: 60, difficulty: "facil", modality: "solo",
    status: "published", isPrivate: false, creatorId: "guide", creatorName: "Guide",
    preview: buildRoutePreview(points), waypoints: points, checkpoints: [], photos: [],
    createdAt: 1, updatedAt: 1,
  };
};

async function main() {
  const storage = memory();
  const cache = CreateRouteDetailCacheRepository(storage, () => 1234);
  const oldRoute = route("cache-route", 0, "Old title");
  const freshRoute = route("cache-route", 0.01, "Fresh title");

  await cache.save(oldRoute);
  assert.equal((await cache.get(oldRoute.id))?.title, "Old title");
  assert.equal((await cache.get(oldRoute.id))?.waypoints.length, 0, "preview cache omits full legacy geometry");

  await cache.save(freshRoute);
  assert.equal((await cache.get(oldRoute.id))?.title, "Fresh title");
  assert.equal([...storage.values.keys()].filter((key) => key.includes(":preview-v")).length, 1,
    "a changed geometry fingerprint replaces the previous route cache entry");

  const updates: Array<{ title: string; source: string }> = [];
  let resolveRemote!: (value: RouteModel | null) => void;
  const remote = new Promise<RouteModel | null>((resolve) => { resolveRemote = resolve; });
  const task = GetRouteDetailWithCacheUseCase(
    oldRoute.id,
    {
      getCached: (id) => cache.get(id),
      getById: async () => remote,
      saveCached: (value) => cache.save(value),
    },
    (value, source) => updates.push({ title: value.title, source }),
    () => assert.fail("a successful revalidation must not report a refresh failure"),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(updates[0], { title: "Fresh title", source: "cache" }, "cached detail arrives before the pending server request");
  resolveRemote(route(oldRoute.id, 0.02, "Server title"));
  await task;
  assert.deepEqual(updates[1], { title: "Server title", source: "server" });
  assert.equal((await cache.get(oldRoute.id))?.title, "Server title", "revalidation replaces stale geometry and metadata");

  let refreshFailed = false;
  const stale = await GetRouteDetailWithCacheUseCase(
    oldRoute.id,
    {
      getCached: (id) => cache.get(id),
      getById: async () => { throw new Error("network unavailable"); },
      saveCached: async () => {},
    },
    () => {},
    () => { refreshFailed = true; },
  );
  assert.equal(stale.title, "Server title");
  assert.equal(refreshFailed, true, "stale detail reports a failed refresh instead of hiding it");

  const boundedStorage = memory();
  const boundedCache = CreateRouteDetailCacheRepository(boundedStorage, () => 2000);
  for (let index = 0; index < 31; index += 1) {
    await boundedCache.save(route(`route-${index}`));
  }
  assert.equal(await boundedCache.get("route-0"), null, "the oldest route detail is evicted after the 30-entry cap");
  assert.ok(await boundedCache.get("route-30"), "the newest route detail remains cached");

  console.log("HU-03 route detail cache: route/preview identity, stale-while-revalidate, and bounded eviction passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
