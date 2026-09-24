import * as Location from "expo-location";
import { BACKGROUND_LOCATION_TASK_NAME } from "./backgroundLocationTask";

/**
 * The background task is defined at module scope (required by Expo TaskManager).
 * Importing its name here also guarantees the task is registered before a
 * recording attempts to start background updates.
 */

/**
 * HU-06 — Servicio de ubicación (adaptador expo-location).
 * Único punto de acceso a la geolocalización de la app, reutilizado por la
 * actividad GPS y (hu 07) por la confirmación del punto inicial.
 * Los permisos se solicitan SOLO dentro de un contexto con justificación.
 */

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface LocationWatch {
  remove: () => void;
}

/**
 * Opciones de precisión para GPS (rescate cruz→main, HU-08, 2026-09-16).
 * Los defaults conservan el comportamiento HU-06 (Balanced, 8 m, 3 s);
 * la grabación (HU-08) pasa `Accuracy.High` + intervalos más finos.
 */
export interface LocationAccuracyOptions {
  accuracy?: Location.Accuracy;
  /** Metros mínimos entre actualizaciones (filtro anti-ruido). */
  distanceInterval?: number;
  /** Milisegundos mínimos entre actualizaciones. */
  timeInterval?: number;
}

export interface BackgroundLocationOptions extends LocationAccuracyOptions {
  /** iOS deferred delivery threshold in milliseconds. */
  deferredUpdatesInterval?: number;
  /** iOS deferred delivery threshold in meters. */
  deferredUpdatesDistance?: number;
}

export const RECORDING_WATCH_OPTIONS: LocationAccuracyOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 5,
  timeInterval: 2500,
};

export const RECORDING_BACKGROUND_OPTIONS: BackgroundLocationOptions = {
  ...RECORDING_WATCH_OPTIONS,
  deferredUpdatesInterval: 10_000,
  deferredUpdatesDistance: 25,
};

function toGpsPosition(pos: Location.LocationObject): GpsPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    altitude: pos.coords.altitude ?? undefined,
    speed: pos.coords.speed ?? undefined,
    heading: pos.coords.heading ?? undefined,
    timestamp: pos.timestamp ?? Date.now(),
  };
}

export const locationService = {
  /** Pide permiso de ubicación en primer plano. Devuelve true si fue concedido. */
  async requestForegroundPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  },

  /** ¿El permiso ya fue concedido? (sin pedirlo). */
  async hasForegroundPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === "granted";
  },

  /** Pide permiso de ubicación en segundo plano (foreground debe existir primero). */
  async requestBackgroundPermission(): Promise<boolean> {
    try {
      if (!(await this.hasForegroundPermission())) {
        if (!(await this.requestForegroundPermission())) return false;
      }
      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  },

  /** ¿El permiso de segundo plano ya fue concedido? (sin pedirlo). */
  async hasBackgroundPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  },

  /**
   * Obtiene la posición actual (pide permiso si aún no se concedió).
   * Devuelve null si el permiso fue denegado o no se pudo obtener la posición.
   * Si el fix en vivo falla (típico en iOS/Expo Go bajo techo), se intenta el
   * último fix conocido del OS como fallback — la frescura la juzga el caller
   * (`seedQualityCheck`, máx. 30 s).
   */
  async getCurrentPosition(
    options?: Pick<LocationAccuracyOptions, "accuracy">,
  ): Promise<GpsPosition | null> {
    if (!(await this.hasForegroundPermission())) {
      if (!(await this.requestForegroundPermission())) {
        return null;
      }
    }
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: options?.accuracy ?? Location.Accuracy.Balanced,
      });
      return toGpsPosition(pos);
    } catch {
      try {
        const last = await Location.getLastKnownPositionAsync({});
        return last ? toGpsPosition(last) : null;
      } catch {
        return null;
      }
    }
  },

  /**
   * Inicia el seguimiento continuo de posición en primer plano.
   * Devuelve null si no hay permiso. El watch se detiene con stopWatching.
   */
  async startWatching(
    onUpdate: (position: GpsPosition) => void,
    options?: LocationAccuracyOptions,
  ): Promise<LocationWatch | null> {
    if (!(await this.hasForegroundPermission())) {
      if (!(await this.requestForegroundPermission())) {
        return null;
      }
    }
    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: options?.accuracy ?? Location.Accuracy.Balanced,
          distanceInterval: options?.distanceInterval ?? 8,
          timeInterval: options?.timeInterval ?? 3000,
        },
        (pos) => onUpdate(toGpsPosition(pos)),
      );
      return sub;
    } catch {
      return null;
    }
  },

  /**
   * HU-08 — Observa la orientación/brújula del dispositivo en tiempo real (0-360°).
   * Devuelve null si no hay sensor disponible o no se concedieron permisos.
   */
  async watchHeading(
    onHeading: (heading: number) => void,
  ): Promise<LocationWatch | null> {
    try {
      if (!(await this.hasForegroundPermission())) {
        if (!(await this.requestForegroundPermission())) {
          return null;
        }
      }
      const sub = await Location.watchHeadingAsync((headingData) => {
        const deg =
          headingData.trueHeading >= 0
            ? headingData.trueHeading
            : headingData.magHeading;
        if (typeof deg === "number" && !isNaN(deg)) {
          onHeading(deg);
        }
      });
      return sub;
    } catch {
      return null;
    }
  },

  /**
   * Starts the process-wide background task. The operation is idempotent so a
   * screen remount or a resume callback cannot register duplicate location
   * producers. A denied background permission does not disable foreground GPS.
   */
  async startBackgroundWatching(
    options?: BackgroundLocationOptions,
  ): Promise<boolean> {
    if (backgroundStartInFlight) return backgroundStartInFlight;
    const lifecycleGeneration = backgroundLifecycleGeneration;
    backgroundStartInFlight = (async () => {
      if (!(await this.hasBackgroundPermission())) {
        if (!(await this.requestBackgroundPermission())) return false;
      }
      try {
        if (lifecycleGeneration !== backgroundLifecycleGeneration) return false;
        if (
          await Location.hasStartedLocationUpdatesAsync(
            BACKGROUND_LOCATION_TASK_NAME,
          )
        ) {
          backgroundStarted = true;
          return true;
        }
        if (lifecycleGeneration !== backgroundLifecycleGeneration) return false;
        await Location.startLocationUpdatesAsync(
          BACKGROUND_LOCATION_TASK_NAME,
          {
            accuracy: options?.accuracy ?? Location.Accuracy.High,
            distanceInterval: options?.distanceInterval ?? 5,
            timeInterval: options?.timeInterval ?? 2500,
            deferredUpdatesInterval: options?.deferredUpdatesInterval ?? 10_000,
            deferredUpdatesDistance: options?.deferredUpdatesDistance ?? 25,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "Grabando ruta",
              notificationBody:
                "Trekkin registra tu recorrido en segundo plano.",
              notificationColor: "#0F766E",
              killServiceOnDestroy: false,
            },
          },
        );
        backgroundStarted = true;
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      backgroundStartInFlight = null;
    });
    return backgroundStartInFlight;
  },

  /** Stops the background task. Repeated calls are safe and do not throw. */
  async stopBackgroundWatching(): Promise<void> {
    if (backgroundStopInFlight) return backgroundStopInFlight;
    backgroundLifecycleGeneration += 1;
    const startInFlight = backgroundStartInFlight;
    backgroundStopInFlight = (async () => {
      try {
        if (startInFlight) await startInFlight;
        if (
          backgroundStarted ||
          (await Location.hasStartedLocationUpdatesAsync(
            BACKGROUND_LOCATION_TASK_NAME,
          ))
        ) {
          await Location.stopLocationUpdatesAsync(
            BACKGROUND_LOCATION_TASK_NAME,
          );
        }
      } catch {
        // A process restart can make the native task disappear between the
        // status check and stop call; stopping remains idempotent for callers.
      } finally {
        backgroundStarted = false;
      }
    })().finally(() => {
      backgroundStopInFlight = null;
    });
    return backgroundStopInFlight;
  },

  /** Detiene un watch activo. */
  stopWatching(watch: LocationWatch | null): void {
    if (watch) watch.remove();
  },
};

let backgroundStarted = false;
let backgroundStartInFlight: Promise<boolean> | null = null;
let backgroundStopInFlight: Promise<void> | null = null;
let backgroundLifecycleGeneration = 0;
