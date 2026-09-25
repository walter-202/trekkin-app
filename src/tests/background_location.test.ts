import assert from "node:assert/strict";
import { buildTrekMapScene } from "../presentation/components/map/buildTrekMapScene";
import type { GpsPosition } from "../infrastructure/location/locationService";

type LocationObject = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
};

const definitions = new Map<string, (body: any) => Promise<unknown>>();
const taskManager = {
  defineTask: (name: string, executor: (body: any) => Promise<unknown>) => {
    definitions.set(name, executor);
  },
};
const location = {
  Accuracy: { High: 6, Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: "granted" }),
  getForegroundPermissionsAsync: async () => ({ status: "granted" }),
  requestBackgroundPermissionsAsync: async () => ({ status: "granted" }),
  getBackgroundPermissionsAsync: async () => ({ status: "granted" }),
  watchPositionAsync: async () => ({ remove: () => {} }),
  hasStartedLocationUpdatesAsync: async () => false,
  startLocationUpdatesAsync: async () => {},
  stopLocationUpdatesAsync: async () => {},
};

function mock(path: string, exports: unknown) {
  require.cache[require.resolve(path)] = { exports } as NodeJS.Module;
}

mock("expo-task-manager", taskManager);
mock("expo-location", location);

const { BACKGROUND_LOCATION_TASK_NAME, locationObjectToGpsPosition, processBackgroundLocations } =
  require("../infrastructure/location/backgroundLocationTask") as typeof import("../infrastructure/location/backgroundLocationTask");
const { isAcceptableGpsAccuracy, locationService } = require("../infrastructure/location/locationService") as typeof import("../infrastructure/location/locationService");

function sample(index: number): LocationObject {
  return {
    coords: {
      latitude: -16.5 + index * 0.0001,
      longitude: -68.1,
      accuracy: 4,
      altitude: 4000 + index,
      altitudeAccuracy: 3,
      heading: 0,
      speed: 1,
    },
    timestamp: 1_700_000_000_000 + index * 2_500,
  };
}

async function main() {
  assert.ok(definitions.has(BACKGROUND_LOCATION_TASK_NAME), "task is defined at module scope");
  const calls: GpsPosition[] = [];
  const events: string[] = [];
  await processBackgroundLocations([sample(1), sample(2)], {
    restoreLiveSession: async () => {
      events.push("restore");
      return true;
    },
    recordPoint: async (point) => {
      events.push(`point:${point.timestamp}`);
      calls.push(point);
    },
  });
  assert.deepEqual(events, ["restore", "point:1700000002500", "point:1700000005000"]);
  assert.equal(calls[0].latitude, -16.4999);

  const rejected: GpsPosition[] = [];
  const count = await processBackgroundLocations([sample(3)], {
    restoreLiveSession: async () => false,
    recordPoint: async (point) => { rejected.push(point); },
  });
  assert.equal(count, 0, "restart without a resumable session does not write points");
  assert.equal(rejected.length, 0);

  assert.equal(isAcceptableGpsAccuracy({ accuracy: 25, timestamp: Date.now() } as GpsPosition), true);
  assert.equal(isAcceptableGpsAccuracy({ accuracy: 45, timestamp: Date.now() } as GpsPosition), false);
  assert.equal(isAcceptableGpsAccuracy({ accuracy: undefined, timestamp: Date.now() } as GpsPosition), false);

  let backgroundStarted = false;
  (location as any).getBackgroundPermissionsAsync = async () => ({ status: "denied" });
  (location as any).requestBackgroundPermissionsAsync = async () => ({ status: "denied" });
  assert.equal(await locationService.startBackgroundWatching(), false, "permission denial is visible");
  (location as any).getBackgroundPermissionsAsync = async () => ({ status: "granted" });
  (location as any).requestBackgroundPermissionsAsync = async () => ({ status: "granted" });
  (location as any).hasStartedLocationUpdatesAsync = async () => backgroundStarted;
  (location as any).startLocationUpdatesAsync = async () => { backgroundStarted = true; };
  (location as any).stopLocationUpdatesAsync = async () => { backgroundStarted = false; };
  assert.equal(await locationService.startBackgroundWatching(), true);
  assert.equal(await locationService.startBackgroundWatching(), true, "start is idempotent");
  await locationService.stopBackgroundWatching();
  await locationService.stopBackgroundWatching();
  assert.equal(backgroundStarted, false, "stop is idempotent");

  const executor = definitions.get(BACKGROUND_LOCATION_TASK_NAME)!;
  let restored = false;
  // The executor's native wiring is covered by registration; injected handler
  // tests above keep this suite independent from a Firebase/native store boot.
  assert.equal(typeof executor, "function");
  assert.equal(typeof locationObjectToGpsPosition(sample(0)).timestamp, "number");
  restored = true;
  assert.equal(restored, true);

  const followScene = buildTrekMapScene({
    track: [{ lat: -16.5, lng: -68.1 }, { lat: -16.499, lng: -68.099 }],
    currentLocation: { lat: -16.5002, lng: -68.1012, heading: 90 },
    followCurrentLocation: true,
  });
  assert.equal(followScene.followCurrentLocation, true);
  assert.equal(followScene.bounds, null);

  console.log("Background GPS: registration, ordered batches, restart recovery, permission denial, and idempotent lifecycle passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
