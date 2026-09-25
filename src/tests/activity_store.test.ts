/// <reference types="node" />
import assert from "node:assert/strict";
import type { LiveActivity } from "../core/domain/activity";
import type { TrekkinActivity } from "../core/domain/types";
import type { GpsPosition } from "../infrastructure/location/locationService";

const disk = new Map<string, string>();
let diskFull = false;
const storage = {
  getItem: async (key: string) => disk.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (diskFull) throw new Error("Disk full");
    disk.set(key, value);
  },
  removeItem: async (key: string) => {
    disk.delete(key);
  },
};
function mock(path: string, exports: unknown) {
  require.cache[require.resolve(path)] = { exports } as NodeJS.Module;
}
mock("@react-native-async-storage/async-storage", storage);
mock("../infrastructure/persistence/storage", { appStorage: storage });
mock("../infrastructure/database/routeService", { routeService: {} });
mock("../infrastructure/database/activityService", {
  activityService: {
    createActivity: () => new Promise(() => {}),
    listUserActivities: async () => {
      throw new Error("Offline");
    },
  },
});
mock("../infrastructure/location/locationService", {
  locationService: {
    stopWatching: () => {},
    startWatching: async () => null,
  },
});
const { useActivityStore } =
  require("../infrastructure/persistence/useActivityStore") as typeof import("../infrastructure/persistence/useActivityStore");

async function main() {
  const store = useActivityStore;
  await store
    .getState()
    .startFreeRecording({ lat: 0, lng: 0 }, "owner", "Hiker");
  const now = Date.now();
  const point = (index: number): GpsPosition => ({
    latitude: index * 0.0001,
    longitude: 0,
    timestamp: now + index * 1000,
    accuracy: 5,
  });
  await Promise.all(
    [1, 2, 3].map((i) => store.getState().recordPoint(point(i))),
  );
  assert.equal(
    store.getState().live!.recordedPoints.length,
    3,
    "Concurrent callbacks must all survive",
  );
  diskFull = true;
  await store.getState().recordPoint(point(4));
  assert.equal(
    store.getState().live!.recordedPoints.length,
    3,
    "Do not claim an unpersisted point",
  );
  assert.match(store.getState().error!, /Disk full/);
  diskFull = false;
  await store.getState().recordPoint(point(4));
  assert.equal(
    store.getState().live!.recordedPoints.length,
    4,
    "Queue recovers after failure",
  );
  let timeout: ReturnType<typeof setTimeout>;
  const result = await Promise.race([
    store.getState().finishActivity(),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Finish waited for network")),
        500,
      );
    }),
  ]).finally(() => clearTimeout(timeout));
  assert.ok(result);
  assert.equal(result.saved.isSynced, false);
  assert.equal(result.saved.recordedPoints.length, 4);
  const archive = JSON.parse(
    disk.get("trekking_activity_unsynced")!,
  ) as TrekkinActivity[];
  assert.equal(archive[0].id, result.saved.id);
  await store.getState().clearLive();
  await store.getState().listActivities("owner");
  assert.equal(
    store.getState().activities.length,
    1,
    "History works without Firestore",
  );
  await store.getState().listActivities("other");
  assert.equal(
    store.getState().activities.length,
    0,
    "Local history must be owner-scoped",
  );
  assert.equal(
    await store.getState().loadActivity(result.saved.id, "other"),
    null,
  );

  await store
    .getState()
    .startFreeRecording({ lat: 0, lng: 0 }, "owner", "Hiker");
  for (let i = 0; i < 305; i += 1) {
    await store.getState().recordPoint(point(i));
  }
  assert.equal(store.getState().live!.recordedPoints.length, 300);
  assert.equal(store.getState().mapTrack.length, 305);
  await store.getState().clearLive();

  const legacyPoints = Array.from({ length: 305 }, (_, i) => ({
    lat: i * 0.0001,
    lng: 0,
    timestamp: now + i * 1000,
  }));
  const legacy: LiveActivity = {
    id: "legacy-map-track",
    userId: "owner",
    userName: "Hiker",
    route: {
      routeId: "free-legacy",
      routeTitle: "Legacy free",
      startPoint: { name: "Inicio", lat: 0, lng: 0 },
      endPoint: { name: "Final", lat: 0, lng: 0 },
      waypoints: [],
      checkpoints: [],
      distanceKm: 0,
      durationMinutes: 0,
      difficulty: "facil",
    },
    phase: "in_progress",
    startedAt: now,
    lastResumedAt: now,
    accumulatedActiveMs: 0,
    recordedPoints: legacyPoints,
    totalDistanceKm: 1,
    completedCheckpoints: [],
    createdAt: now,
    updatedAt: now,
    origin: "free",
  };
  disk.set("trekking_activity_autosave", JSON.stringify(legacy));
  assert.equal(await store.getState().restoreLiveSession(), true);
  assert.equal(store.getState().live!.recordedPoints.length, 300);
  assert.equal(store.getState().mapTrack.length, 305);
  assert.notStrictEqual(
    store.getState().live!.recordedPoints,
    store.getState().mapTrack,
  );
  await store.getState().clearLive();

  console.log(
    "Activity store: ordered capture, mapTrack, disk failure, offline finish/history and ownership passed",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
