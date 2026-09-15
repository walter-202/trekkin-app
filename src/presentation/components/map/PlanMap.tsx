import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Map,
  Camera,
  GeoJSONSource,
  Layer,
  type MapProps,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import type { PlannedPoint } from '../../../core/domain/plan';
import { ensureMapOfflineCache } from '../../../infrastructure/map/offlineMaps';

/**
 * HU-07 — Plata de planificación (MapLibre nativo + tiles OpenStreetMap).
 * Mapa 100% nativo, sin WebView ni HTML/DOM. Tap reporta coordenadas vía onPressCoordinate.
 * Markers: inicio provisional, destino y ubicación actual. Offline: caché de tiles (MapLibre).
 */
interface PlanRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface PlanMapProps {
  start?: PlannedPoint | null;
  end?: PlannedPoint | null;
  currentLocation?: PlannedPoint | null;
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  initialRegion?: PlanRegion;
  height?: number;
}

const DEFAULT_REGION: PlanRegion = {
  latitude: -16.499,
  longitude: -68.146,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

const POINT_COLORS: Record<string, string> = {
  current: '#3B82F6',
  start: '#10B981',
  end: '#F59E0B',
};

interface MarkerPoint {
  kind: string;
  point: PlannedPoint;
}

export const PlanMap: React.FC<PlanMapProps> = ({
  start,
  end,
  currentLocation,
  onPressCoordinate,
  initialRegion,
  height = 300,
}) => {
  useEffect(() => {
    ensureMapOfflineCache();
  }, []);

  const handlePress: MapProps['onPress'] = (event) => {
    if (!onPressCoordinate) return;
    const [lng, lat] = event.nativeEvent.lngLat;
    onPressCoordinate({ lat, lng });
  };

  const markers: MarkerPoint[] = [];
  if (currentLocation) markers.push({ kind: 'current', point: currentLocation });
  if (start) markers.push({ kind: 'start', point: start });
  if (end) markers.push({ kind: 'end', point: end });

  const features = {
    type: 'FeatureCollection' as const,
    features: markers.map(({ kind, point }) => ({
      type: 'Feature' as const,
      properties: { kind, color: POINT_COLORS[kind] ?? '#10B981' },
      geometry: {
        type: 'Point' as const,
        coordinates: [point.lng, point.lat] as [number, number],
      },
    })),
  };

  const region = initialRegion ?? DEFAULT_REGION;
  const initialCenter: [number, number] = [region.longitude, region.latitude];
  const initialZoom = Math.min(
    19,
    Math.max(2, Math.round(Math.log2(360 / region.longitudeDelta) + 0.35)),
  );

  return (
    <View style={[styles.wrap, { height }]}>
      <Map
        style={styles.map}
        mapStyle={OSM_STYLE}
        onPress={handlePress}
        attributionPosition={{ bottom: 4, left: 4 }}
        tintColor="#10B981"
      >
        <Camera
          initialViewState={{ center: initialCenter, zoom: initialZoom }}
          minZoom={2}
          maxZoom={19}
        />
        {features.features.length > 0 && (
          <GeoJSONSource id="plan-points" data={features}>
            <Layer
              id="plan-points-layer"
              type="circle"
              paint={{
                'circle-radius': ['case', ['==', ['get', 'kind'], 'current'], 12, 9],
                'circle-color': ['get', 'color'],
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 2.5,
                'circle-opacity': 0.95,
              }}
            />
          </GeoJSONSource>
        )}
      </Map>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});