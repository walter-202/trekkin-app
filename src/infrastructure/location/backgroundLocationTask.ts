import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { GpsPosition } from "./locationService";

/** Stable name persisted by Expo across app process restarts. */
export const BACKGROUND_LOCATION_TASK_NAME = "trekkin-background-location";

export interface BackgroundLocationTaskData {
  locations?: Location.LocationObject[];
}

export const MAX_ACCEPTABLE_GPS_ACCURACY_METERS = 30;

export function isAcceptableGpsAccuracy(
  position: Pick<GpsPosition, "accuracy">,
): boolean {
  return typeof position.accuracy === "number"
    && Number.isFinite(position.accuracy)
    && position.accuracy >= 0
    && position.accuracy < MAX_ACCEPTABLE_GPS_ACCURACY_METERS;
}

export interface BackgroundActivityStore {
  /** Restores AsyncStorage/SQLite state before any batch is consumed. */
  restoreLiveSession: () => Promise<boolean>;
  /** Uses the same serialized queue and SQLite-first persistence as foreground GPS. */
  recordPoint: (position: GpsPosition) => Promise<void>;
}

export function locationObjectToGpsPosition(
  location: Location.LocationObject,
): GpsPosition {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? undefined,
    altitude: location.coords.altitude ?? undefined,
    speed: location.coords.speed ?? undefined,
    timestamp: location.timestamp ?? Date.now(),
  };
}

/**
 * Handles a native batch in order. This is dependency-injected so the wiring
 * can be tested without booting Firebase, SQLite, or a native runtime.
 */
export async function processBackgroundLocations(
  locations: readonly Location.LocationObject[],
  store: BackgroundActivityStore,
): Promise<number> {
  if (locations.length === 0) return 0;
  const restored = await store.restoreLiveSession();
  if (!restored) return 0;
  let processed = 0;
  for (const location of locations) {
    const position = locationObjectToGpsPosition(location);
    if (!isAcceptableGpsAccuracy(position)) continue;
    await store.recordPoint(position);
    processed += 1;
  }
  return processed;
}

async function processNativeBatch(
  locations: readonly Location.LocationObject[],
): Promise<number> {
  // Dynamic imports keep the task module free of a static store/locationService
  // cycle. Expo can launch this module headlessly without mounting React views.
  const { useActivityStore } = await import("../persistence/useActivityStore");
  return processBackgroundLocations(locations, {
    restoreLiveSession: () => useActivityStore.getState().restoreLiveSession(),
    recordPoint: (position) => useActivityStore.getState().recordPoint(position),
  });
}

/**
 * Registra el task de ubicación en segundo plano desde el servicio principal.
 * Esto evita que la tarea se duplique si el módulo se importa de varios puntos
 * del flujo de arranque, y conserva el guardado local mediante useActivityStore.
 */
let backgroundTaskRegistered = false;

export function registerBackgroundLocationTask(): void {
  if (backgroundTaskRegistered) return;
  backgroundTaskRegistered = true;
  if (typeof (TaskManager as { isTaskDefined?: (name: string) => boolean }).isTaskDefined === "function" &&
    (TaskManager as { isTaskDefined: (name: string) => boolean }).isTaskDefined(BACKGROUND_LOCATION_TASK_NAME)) {
    return;
  }
  TaskManager.defineTask<BackgroundLocationTaskData>(
    "trekkin-background-location",
    async ({ data, error }) => {
      if (error) return 0;
      const locations = Array.isArray(data?.locations) ? data.locations : [];
      if (locations.length === 0) return 0;
      try {
        return await processNativeBatch(locations);
      } catch {
        return 0;
      }
    },
  );
}

registerBackgroundLocationTask();
