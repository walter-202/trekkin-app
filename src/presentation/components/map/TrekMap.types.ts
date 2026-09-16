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

export interface TrekMapProps {
  /** Trail points (coordinates of the route) */
  trail?: Coordinates[];
  /** Start point of the route */
  start?: { lat: number; lng: number; name?: string } | null;
  /** End point of the route */
  end?: { lat: number; lng: number; name?: string } | null;
  /** Current GPS position of the user */
  currentLocation?: { lat: number; lng: number } | null;
  /** Checkpoints / Points of interest */
  pointsOfInterest?: MapMarker[];
  markers?: MapMarker[];
  /** Initial camera region */
  initialRegion?: MapRegion;
  /** Fixed height or uses style */
  height?: number;
  /** Style override */
  style?: StyleProp<ViewStyle>;
  /** User tap callback with coordinates */
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  onPress?: (coords: { lat: number; lng: number }) => void;
  /** Enable / disable map interaction */
  interactive?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Show user location marker */
  showUserLocation?: boolean;
  /** Path to local offline tile directory */
  offlinePackPath?: string;
  /** Fit camera to specific coordinates */
  fitTo?: Array<{ lat: number; lng: number }>;
  /** Custom children (e.g. overlays, buttons) */
  children?: React.ReactNode;
}
