import * as Location from 'expo-location';
import type { Coordinates } from '../../core/domain/types';

/**
 * HU-08 — Adapter de infraestructura para Expo Location.
 * Opera exclusivamente en primer plano (foreground).
 * NO solicita ni implementa permisos de segundo plano (background).
 */

export interface LocationWatchOptions {
  accuracy?: Location.Accuracy;
  distanceInterval?: number; // Metros mínimos entre actualizaciones (filtro anti-ruido)
  timeInterval?: number; // Milisegundos mínimos entre actualizaciones
}

export type LocationUpdateCallback = (coords: Coordinates) => void;
export type LocationErrorCallback = (error: string) => void;

export const locationAdapter = {
  /**
   * Solicita y valida el permiso de ubicación en primer plano (foreground).
   */
  async requestForegroundPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('Error al solicitar permiso de ubicación:', err);
      return false;
    }
  },

  /**
   * Obtiene la posición GPS actual una sola vez (one-shot).
   */
  async getCurrentPosition(): Promise<Coordinates | null> {
    try {
      const granted = await this.requestForegroundPermission();
      if (!granted) {
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        altitude: loc.coords.altitude ?? undefined,
        timestamp: loc.timestamp,
      };
    } catch (err) {
      console.warn('Error al obtener posición actual:', err);
      return null;
    }
  },

  /**
   * Inicia el seguimiento continuo al GPS en primer plano mediante watchPositionAsync.
   * Retorna LocationSubscription para poder cancelarla con subscription.remove().
   */
  async watchPosition(
    onLocation: LocationUpdateCallback,
    onError?: LocationErrorCallback,
    options?: LocationWatchOptions
  ): Promise<Location.LocationSubscription | null> {
    try {
      const granted = await this.requestForegroundPermission();
      if (!granted) {
        onError?.('Permiso de ubicación denegado. Actívalo para registrar tu ruta.');
        return null;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: options?.accuracy ?? Location.Accuracy.High,
          distanceInterval: options?.distanceInterval ?? 5, // 5 metros mínimos para trekking
          timeInterval: options?.timeInterval ?? 2500, // 2.5 segundos
        },
        (loc) => {
          const coords: Coordinates = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            altitude: loc.coords.altitude ?? undefined,
            timestamp: loc.timestamp,
          };
          onLocation(coords);
        }
      );

      return subscription;
    } catch (err: any) {
      const msg = err?.message ?? 'Error en el seguimiento GPS';
      console.warn('Error en watchPosition:', err);
      onError?.(msg);
      return null;
    }
  },
};

