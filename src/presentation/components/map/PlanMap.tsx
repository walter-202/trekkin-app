import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Region, MapPressEvent } from 'react-native-maps';
import type { PlannedPoint } from '../../../core/domain/plan';

/**
 * HU-07 — Mapa de planificación (react-native-maps).
 * Seletor de puntos: tap en el mapa reporta coordenadas vía onPressCoordinate.
 * Incluye marcadores para inicio provisional, destino y ubicación actual.
 */
interface PlanMapProps {
  start?: PlannedPoint | null;
  end?: PlannedPoint | null;
  currentLocation?: PlannedPoint | null;
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  initialRegion?: Region;
  height?: number;
}

const DEFAULT_REGION: Region = {
  latitude: -16.499,
  longitude: -68.146,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export const PlanMap: React.FC<PlanMapProps> = ({
  start,
  end,
  currentLocation,
  onPressCoordinate,
  initialRegion,
  height = 300,
}) => {
  const handlePress = (e: MapPressEvent) => {
    if (!onPressCoordinate) return;
    const coord = e.nativeEvent.coordinate;
    onPressCoordinate({ lat: coord.latitude, lng: coord.longitude });
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion ?? DEFAULT_REGION}
        onPress={handlePress}
        showsUserLocation={false}
        scrollEnabled
        zoomEnabled
      >
        {start && (
          <Marker
            coordinate={{ latitude: start.lat, longitude: start.lng }}
            pinColor="#10B981"
            title={start.name ?? 'Punto inicial'}
          />
        )}
        {end && (
          <Marker
            coordinate={{ latitude: end.lat, longitude: end.lng }}
            pinColor="#F59E0B"
            title={end.name ?? 'Destino'}
          />
        )}
        {currentLocation && (
          <Marker
            coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
            pinColor="#3B82F6"
            title={currentLocation.name ?? 'Ubicación actual'}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A4537',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});