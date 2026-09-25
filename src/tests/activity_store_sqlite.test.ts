/// <reference types="node" />
import assert from "node:assert/strict";
import type { GpsPosition } from "../infrastructure/location/locationService";

type PointRow = {
  activityId: string;
  seq: number;
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
};

const disk = new Map<string, string>();
let failAutosave = false;
let backgroundStartResult = true;
const rows: PointRow[] = [];
const storage = {
  getItem: async (key: string) => disk.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    if (failAutosave && key === "trekking_activity_autosave") {
      throw new Error("autosave failed");
    }
    disk.set(key, value);
  },
  removeItem: async (key: string) => {
    disk.delete(key);
  },
};

function mock(path: string, exports: unknown) {
  require.cache[require.resolve(path)] = { exports } as NodeJS.Module;
}

const db = {
  execSync(): void {},
  runSync(sql: string, params: unknown) {
    const args = (Array.isArray(params) ? params : []) as unknown[];
    const upper = sql.toUpperCase();
    if (upper.includes("INSERT INTO TRACK_POINTS")) {
      rows.push({
        activityId: String(args[0]),
        seq: Number(args[1]),
        lat: Number(args[2]),
        lng: Number(args[3]),
        altitude: args[4] as number | null,
        accuracy: args[5] as number | null,
        speed: args[6] as number | null,
        timestamp: Number(args[7]),
      });
    }
    return { lastInsertRowId: 0, changes: 1 };
  },
  getFirstSync<T>(sql: string, params: unknown): T | null {
    const args = (Array.isArray(params) ? params : []) as unknown[];
    const upper = sql.toUpperCase();
    if (upper.includes("PRAGMA USER_VERSION")) {
      return { user_version: 1 } as T;
    }
    if (upper.includes("SELECT MAX(SEQ)")) {
      const values = rows
        .filter((row) => row.activityId === args[0])
        .map((row) => row.seq);
      return { maxSeq: values.length > 0 ? Math.max(...values) : null } as T;
    }
    if (upper.includes("SELECT COUNT(*)")) {
      return {
        n: rows.filter((row) => row.activityId === args[0]).length,
      } as T;
    }
    return null;
  },
  getAllSync<T>(sql: string, params: unknown): T[] {
    const args = (Array.isArray(params) ? params : []) as unknown[];
    return rows
      .filter((row) => row.activityId === args[0])
      .sort((a, b) => a.seq - b.seq)
      .slice(Number(args[2]), Number(args[2]) + Number(args[1])) as T[];
  },
};

mock("@react-native-async-storage/async-storage", storage);
mock("../infrastructure/persistence/storage", { appStorage: storage });
mock("../infrastructure/database/routeService", { routeService: {} });
mock("../infrastructure/database/activityService", {
  activityService: {
    createActivity: async () => undefined,
    listUserActivities: async () => [],
  },
});
mock("../infrastructure/location/locationService", {
  locationService: {
    stopWatching: () => undefined,
    startWatching: async () => ({ remove: () => undefined }),
    stopBackgroundWatching: async () => undefined,
    startBackgroundWatching: async () => backgroundStartResult,
  },
});
mock("expo-sqlite", { openDatabaseSync: () => db });

const { useActivityStore } =
  require("../infrastructure/persistence/useActivityStore") as typeof import("../infrastructure/persistence/useActivityStore");

async function main() {
  const store = useActivityStore;
  const point = (index: number): GpsPosition => ({
    latitude: index * 0.0001,
    longitude: 0,
    timestamp: Date.now() + index * 1000,
    accuracy: 5,
  });

  assert.equal(
    await store
      .getState()
      .startFreeRecording({ lat: 0, lng: 0 }, "owner", "Hiker"),
    true,
  );
  failAutosave = true;
  await store.getState().recordPoint(point(0));
  assert.equal(rows.length, 1);
  assert.equal(store.getState().live!.recordedPoints.length, 1);
  assert.equal(store.getState().mapTrack.length, 1);
  assert.match(store.getState().error!, /autosave failed/);

  failAutosave = false;
  const farPoint = {
    latitude: 1,
    longitude: 0,
    timestamp: Date.now(),
    accuracy: 5,
  };
  for (let i = 0; i < 3; i += 1) {
    await store.getState().recordPoint({
      ...farPoint,
      timestamp: farPoint.timestamp + i * 1000,
    });
  }
  const activityId = rows[0].activityId;
  assert.equal(rows.filter((row) => row.activityId === activityId).length, 1);
  assert.equal(store.getState().live!.recordedPoints.length, 1);
  assert.equal(store.getState().mapTrack.length, 1);
  assert.equal(store.getState().gpsStats.discardedTooFar, 3);
  assert.equal(store.getState().live!.totalDistanceKm, 0);

  await store.getState().recordPoint(point(1));
  assert.equal(rows.filter((row) => row.activityId === activityId).length, 2);
  assert.equal(store.getState().live!.recordedPoints.length, 2);
  assert.equal(store.getState().mapTrack.length, 2);
  assert.ok((store.getState().live!.totalDistanceKm ?? 0) > 0);

  backgroundStartResult = false;
  assert.equal(await store.getState().startWatch(), true);
  assert.ok(store.getState().watch);
  assert.equal(store.getState().backgroundWatchActive, false);
  assert.match(
    store.getState().backgroundWatchError!,
    /background no se pudo iniciar/,
  );

  backgroundStartResult = true;
  assert.equal(await store.getState().startWatch(), true);
  assert.equal(store.getState().backgroundWatchActive, true);
  assert.equal(store.getState().backgroundWatchError, null);

  await store.getState().clearLive();
  assert.equal(store.getState().mapTrack.length, 0);

  assert.equal(
    await store
      .getState()
      .startFreeRecording({ lat: 0, lng: 0 }, "owner", "Hiker"),
    true,
  );
  const longActivityId = store.getState().live!.id;
  const checkpoints = new Set([1, 10, 300, 301, 420]);
  for (let i = 0; i < 420; i += 1) {
    await store.getState().recordPoint(point(i));
    if (checkpoints.has(i + 1)) {
      assert.ok(store.getState().live!.recordedPoints.length <= 300);
      assert.equal(store.getState().mapTrack.length, i + 1);
    }
  }
  assert.equal(
    rows.filter((row) => row.activityId === longActivityId).length,
    420,
  );
  assert.equal(store.getState().live!.recordedPoints.length, 300);
  assert.equal(store.getState().mapTrack.length, 420);
  await store.getState().clearLive();

  console.log(
    "Activity store SQLite: durable point survives autosave header failure",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
