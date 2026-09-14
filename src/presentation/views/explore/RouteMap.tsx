import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { RouteModel } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

interface RouteMapProps {
  route: RouteModel;
}

/**
 * HU-03 C14/C15 — Mapa interactivo (zoom + pan habilitados).
 * Nativo vía `react-native-maps`. En web se muestra fallback estático
 * (Expo web sin API key) con el trazado resumido.
 */
export const RouteMap: React.FC<RouteMapProps> = ({ route }) => {
  const region = useMemo(() => {
    const pts = [
      { lat: route.startPoint.lat, lng: route.startPoint.lng },
      { lat: route.endPoint.lat, lng: route.endPoint.lng },
      ...route.waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
    ];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
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
  }, [route]);

  if (Platform.OS === "web") {
    return (
      <View
        style={styles.fallback}
        accessibilityLabel="Vista previa del trazado"
      >
        <Text style={styles.fallbackTitle}>Vista previa del trazado</Text>
        <Text style={styles.fallbackText}>
          {route.startPoint.name} ({route.startPoint.lat.toFixed(3)},{" "}
          {route.startPoint.lng.toFixed(3)}) → {route.endPoint.name} (
          {route.endPoint.lat.toFixed(3)}, {route.endPoint.lng.toFixed(3)}) ·{" "}
          {route.waypoints.length} puntos
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
        accessibilityLabel={`Mapa de ${route.title}`}
      >
        <Marker
          coordinate={{
            latitude: route.startPoint.lat,
            longitude: route.startPoint.lng,
          }}
          title={`Inicio: ${route.startPoint.name}`}
        />
        <Marker
          coordinate={{
            latitude: route.endPoint.lat,
            longitude: route.endPoint.lng,
          }}
          title={`Final: ${route.endPoint.name}`}
          pinColor={AndeanTheme.colors.amber}
        />
        {route.waypoints.length > 1 ? (
          <Polyline
            coordinates={route.waypoints.map((w) => ({
              latitude: w.lat,
              longitude: w.lng,
            }))}
            strokeWidth={3}
          />
        ) : null}
        {route.checkpoints.map((cp) => (
          <Marker
            key={cp.id}
            coordinate={{ latitude: cp.lat, longitude: cp.lng }}
            title={cp.name}
            description={cp.notes}
            pinColor={AndeanTheme.colors.primary}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 240,
    borderRadius: AndeanTheme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  map: { flex: 1 },
  fallback: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.lg,
    padding: AndeanTheme.spacing.md,
    gap: 6,
  },
  fallbackTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  fallbackText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});
