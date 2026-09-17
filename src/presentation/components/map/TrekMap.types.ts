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
  currentLocation?: { lat: number; lng: number } | null;
  pointsOfInterest?: MapMarker[];
  markers?: MapMarker[];
  initialRegion?: MapRegion;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  onPress?: (coords: { lat: number; lng: number }) => void;
  interactive?: boolean;
  accessibilityLabel?: string;
  showUserLocation?: boolean;
  /**
   * Reservado HU-04: ruta a pack local (PMTiles/MBTiles).
   * V1 online ignora este campo; no usar carpetas PNG.
   */
  offlinePackPath?: string;
  /** @deprecated V1 ya no usa UrlTile; se conserva por compatibilidad. */
  tileUrlTemplate?: string;
  fitTo?: Array<{ lat: number; lng: number }>;
  children?: React.ReactNode;
}
