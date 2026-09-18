import * as Location from "expo-location";

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

/** HU-08 — Configuración de grabación: High + 5 m / 2.5 s. */
export const RECORDING_WATCH_OPTIONS: LocationAccuracyOptions = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 5,
  timeInterval: 2500,
};

function toGpsPosition(pos: Location.LocationObject): GpsPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    altitude: pos.coords.altitude ?? undefined,
    speed: pos.coords.speed ?? undefined,
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

  /**
   * Obtiene la posición actual (pide permiso si aún no se concedió).
   * Devuelve null si el permiso fue denegado o no se pudo obtener la posición.
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
      return null;
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

  /** Detiene un watch activo. */
  stopWatching(watch: LocationWatch | null): void {
    if (watch) watch.remove();
  },
};
