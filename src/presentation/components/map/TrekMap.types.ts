import type { StyleProp, ViewStyle } from "react-native";
import type { Coordinates } from "../../../core/domain/types";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  notes?: string;
  type?: "start" | "end" | "checkpoint" | "user";
  category?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Contrato estable de `<TrekMap />` — las HUs programan contra esto.
 * V1 pinta con MapLibre GL JS (web DOM / WebView en Expo Go).
 * V2 puede cambiar a @maplibre/maplibre-react-native sin tocar las vistas.
 */
export interface TrekMapProps {
  /** Trazado oficial de la ruta (HU-03 / HU-06). */
  trail?: Coordinates[];
  /** Recorrido GPS grabado (HU-06 / HU-08). */
  track?: Coordinates[];
  start?: { lat: number; lng: number; name?: string } | null;
  end?: { lat: number; lng: number; name?: string } | null;
  currentLocation?: { lat: number; lng: number; heading?: number } | null;
  pointsOfInterest?: MapMarker[];
  markers?: MapMarker[];
  initialRegion?: MapRegion;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  onPress?: (coords: { lat: number; lng: number }) => void;
  /** Lifecycle hooks for views that need a truthful renderer fallback. */
  /** True only after the configured local PMTiles style has loaded. */
  onMapReady?: (offlinePackReady: boolean) => void;
  onMapError?: (error: Error) => void;
  interactive?: boolean;
  accessibilityLabel?: string;
  showUserLocation?: boolean;
  /**
   * Pack de fondo HU-04: URI/URL `.pmtiles` (V1) o `.mbtiles` (detectado, no pintado en Expo Go).
   * El GPX/trail se dibuja igual si el pack no carga.
   */
  offlinePackPath?: string;
  /** @deprecated V1 ya no usa UrlTile; se conserva por compatibilidad. */
  tileUrlTemplate?: string;
  fitTo?: Array<{ lat: number; lng: number }>;
  children?: React.ReactNode;
}
