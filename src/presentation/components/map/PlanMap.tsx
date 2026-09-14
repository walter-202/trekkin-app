import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  Polyline,
  Region,
  MapPressEvent,
} from "react-native-maps";
import type { PlannedPoint } from "../../../core/domain/plan";

/** Punto genérico del trazado (waypoints de HU-03, futuro track GPS de HU-08). */
export interface TrailPoint {
  lat: number;
  lng: number;
}

/** Punto relevante genérico (checkpoints de HU-03). */
export interface PointOfInterest {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  notes?: string;
}

/**
 * Mapa compartido (react-native-maps) — HU-07 + HU-03.
 * HU-07: selector de puntos (tap reporta coordenadas vía onPressCoordinate).
 * HU-03: visualización de trazado completo (`trail` → Polyline,
 * `pointsOfInterest` → marcadores). Ambas props son opcionales: HU-07
 * funciona igual sin pasarlas.
 */
interface PlanMapProps {
  start?: PlannedPoint | null;
  end?: PlannedPoint | null;
  currentLocation?: PlannedPoint | null;
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  initialRegion?: Region;
  height?: number;
  trail?: TrailPoint[];
  pointsOfInterest?: PointOfInterest[];
  accessibilityLabel?: string;
}

const DEFAULT_REGION: Region = {
  latitude: -16.499,
  longitude: -68.146,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

function boundsRegion(
  points: Array<{ lat: number; lng: number }>,
): Region | null {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.6),
  };
}

export const PlanMap: React.FC<PlanMapProps> = ({
  start,
  end,
  currentLocation,
  onPressCoordinate,
  initialRegion,
  height = 300,
  trail,
  pointsOfInterest,
  accessibilityLabel,
}) => {
  const region = useMemo(() => {
    if (initialRegion) return initialRegion;
    // Solo cuando hay trazado (HU-03): encuadra inicio/fin/waypoints.
    // Sin trail (HU-07) se conserva el DEFAULT_REGION de La Paz.
    if (trail && trail.length > 0) {
      const pts: Array<{ lat: number; lng: number }> = [...trail];
      if (start) pts.push({ lat: start.lat, lng: start.lng });
      if (end) pts.push({ lat: end.lat, lng: end.lng });
      return boundsRegion(pts) ?? DEFAULT_REGION;
    }
    return DEFAULT_REGION;
  }, [initialRegion, trail, start, end]);

  const handlePress = (e: MapPressEvent) => {
    if (!onPressCoordinate) return;
    const coord = e.nativeEvent.coordinate;
    onPressCoordinate({ lat: coord.latitude, lng: coord.longitude });
  };

  // Web sin API key de Google Maps: vista previa estática del trazado.
  if (Platform.OS === "web") {
    const trailCount = trail?.length ?? 0;
    const poiCount = pointsOfInterest?.length ?? 0;
    return (
      <View
        style={[styles.fallback, { minHeight: height }]}
        accessibilityLabel="Vista previa del trazado"
      >
        <Text style={styles.fallbackTitle}>
          {accessibilityLabel ?? "Vista previa del trazado"}
        </Text>
        <Text style={styles.fallbackText}>
          {[
            start ? `Inicio: ${start.name ?? ""}` : null,
            end ? `Destino: ${end?.name ?? ""}` : null,
          ]
            .filter(Boolean)
            .join(" → ") || "Sin puntos"}
          {trailCount > 0 ? ` · ${trailCount} puntos de trazado` : ""}
          {poiCount > 0 ? ` · ${poiCount} puntos relevantes` : ""}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={region}
        onPress={handlePress}
        showsUserLocation={false}
        scrollEnabled
        zoomEnabled
        rotateEnabled
        pitchEnabled
        accessibilityLabel={accessibilityLabel ?? "Mapa de ruta"}
      >
        {start && (
          <Marker
            coordinate={{ latitude: start.lat, longitude: start.lng }}
            pinColor="#10B981"
            title={start.name ?? "Punto inicial"}
          />
        )}
        {end && (
          <Marker
            coordinate={{ latitude: end.lat, longitude: end.lng }}
            pinColor="#F59E0B"
            title={end.name ?? "Destino"}
          />
        )}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
            }}
            pinColor="#3B82F6"
            title={currentLocation.name ?? "Ubicación actual"}
          />
        )}
        {trail && trail.length > 1 && (
          <Polyline
            coordinates={trail.map((p) => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeWidth={3}
          />
        )}
        {(pointsOfInterest ?? []).map((poi) => (
          <Marker
            key={poi.id}
            coordinate={{ latitude: poi.lat, longitude: poi.lng }}
            title={poi.name ?? "Punto relevante"}
            description={poi.notes}
            pinColor="#10B981"
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1A4537",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    backgroundColor: "#0E2E24",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 16,
    padding: 12,
    gap: 6,
    justifyContent: "center",
  },
  fallbackTitle: { color: "#F9FAFB", fontSize: 12, fontWeight: "800" },
  fallbackText: { color: "#9CA3AF", fontSize: 11, lineHeight: 16 },
});
