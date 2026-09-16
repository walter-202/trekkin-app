import React, { useEffect, useMemo, useRef } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type MapViewType from "react-native-maps";
import type { Region } from "react-native-maps";
import { Mountain, MapPin, Flag, Navigation } from "lucide-react-native";
import { AndeanTheme } from "../../theme";
import type { TrekMapProps, MapMarker } from "./TrekMap.types";
import {
  computeBoundingBox,
  boundsToRegion,
  DEFAULT_BOLIVIA_REGION,
} from "../../../core/domain/geoBounds";
import type { Coordinates } from "../../../core/domain/types";

/**
 * HU-03 Web — `react-native-maps` ejecuta sus specs nativas al importarse
 * (`codegenNativeComponent`), lo que revienta en web ANTES de llegar al fallback.
 * Por eso solo se importan tipos (borrados en compilación) y los valores se
 * cargan diferidos y SOLO en nativo; en web este módulo nunca se ejecuta.
 */
const NativeMaps: typeof import("react-native-maps") | null =
  Platform.OS === "web" ? null : require("react-native-maps");

/**
 * HU-03 Android — Fuente base de teselas online (datos OpenStreetMap, sin API key).
 * Se usa Carto Voyager y NO `tile.openstreetmap.org` directo: el servidor OSM
 * exige `User-Agent` válido y estrangula (403) los requests del SDK de mapas,
 * que `UrlTile` no permite fijar. Carto admite uso en apps con atribución.
 * Override puntual vía prop `tileUrlTemplate`.
 */
const DEFAULT_TILE_URL =
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

export const TrekMap: React.FC<TrekMapProps> = ({
  trail = [],
  start,
  end,
  currentLocation,
  pointsOfInterest = [],
  markers = [],
  initialRegion,
  height = 280,
  style,
  onPressCoordinate,
  onPress,
  interactive = true,
  accessibilityLabel,
  showUserLocation = false,
  offlinePackPath,
  tileUrlTemplate,
  fitTo,
  children,
}) => {
  const mapRef = useRef<MapViewType | null>(null);

  // Unifica marcadores recibidos por markers o pointsOfInterest
  const allMarkers = useMemo(() => {
    const combined: MapMarker[] = [...markers];
    for (const poi of pointsOfInterest) {
      if (!combined.some((m) => m.id === poi.id)) {
        combined.push(poi);
      }
    }
    return combined;
  }, [markers, pointsOfInterest]);

  // Extrae todos los puntos para calcular la región o bounding box
  const allCoordinates = useMemo<Coordinates[]>(() => {
    const coords: Coordinates[] = [...trail];
    if (start) coords.push({ lat: start.lat, lng: start.lng });
    if (end) coords.push({ lat: end.lat, lng: end.lng });
    for (const m of allMarkers) {
      coords.push({ lat: m.lat, lng: m.lng });
    }
    if (currentLocation) {
      coords.push({ lat: currentLocation.lat, lng: currentLocation.lng });
    }
    return coords;
  }, [trail, start, end, allMarkers, currentLocation]);

  // Calcula la región óptima de visualización inicial
  const computedRegion: Region = useMemo(() => {
    if (initialRegion) return initialRegion;
    if (allCoordinates.length === 0) return DEFAULT_BOLIVIA_REGION;
    const bbox = computeBoundingBox(allCoordinates, 0.2);
    return boundsToRegion(bbox);
  }, [initialRegion, allCoordinates]);

  // Ajusta la cámara cuando cambian los puntos
  useEffect(() => {
    if (!mapRef.current) return;
    const targetPoints = fitTo
      ? fitTo.map((p) => ({ latitude: p.lat, longitude: p.lng }))
      : allCoordinates.map((p) => ({ latitude: p.lat, longitude: p.lng }));

    if (targetPoints.length >= 2) {
      mapRef.current.fitToCoordinates(targetPoints, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [fitTo, allCoordinates]);

  const handlePress = (e: any) => {
    if (!interactive) return;
    const coords = e.nativeEvent?.coordinate;
    if (coords && typeof coords.latitude === "number") {
      const point = { lat: coords.latitude, lng: coords.longitude };
      onPress?.(point);
      onPressCoordinate?.(point);
    }
  };

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { height },
    style,
  ];

  // Fallback web: react-native-maps no corre en navegador web sin módulos nativos
  if (Platform.OS === "web") {
    return (
      <View
        style={[containerStyle, styles.webFallback]}
        accessibilityLabel={accessibilityLabel || "Mapa no disponible en web"}
      >
        <Mountain size={32} color={AndeanTheme.colors.primaryLight} />
        <Text style={styles.webFallbackTitle}>Vista Web — Trekkin Bolivia</Text>
        <Text style={styles.webFallbackSubtitle}>
          {allCoordinates.length > 0
            ? `${allCoordinates.length} puntos cargados en la ruta`
            : "Seleccione una ruta para ver su trazado"}
        </Text>
        {children}
      </View>
    );
  }

  // Nativo: en este punto Platform.OS !== "web", NativeMaps existe sí o sí.
  // Se desestructura aquí (y no a nivel módulo) para que en web nunca se toque.
  const {
    default: MapView,
    Marker,
    Polyline,
    UrlTile,
    PROVIDER_DEFAULT,
  } = NativeMaps as typeof import("react-native-maps");

  // URL del proveedor de teselas: local si hay paquete offline, de red si online
  // (override vía `tileUrlTemplate` para espejos con política permisiva).
  const tileUrl = offlinePackPath
    ? `file://${offlinePackPath}/{z}/{x}/{y}.png`
    : (tileUrlTemplate ?? DEFAULT_TILE_URL);

  return (
    <View
      style={containerStyle}
      accessibilityLabel={accessibilityLabel || "Mapa interactivo de la ruta"}
    >
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        // HU-03 Android: `PROVIDER_DEFAULT` en Android ES el SDK de Google Maps
        // (no existe renderer sin Google en react-native-maps). Con `mapType="none"`
        // la base Google no se dibuja y el <UrlTile> OSM queda como única capa
        // de teselas. En iOS se deja `standard` (Apple Maps nativo, gratis).
        mapType={Platform.OS === "android" ? "none" : "standard"}
        initialRegion={computedRegion}
        onPress={handlePress}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={interactive}
        rotateEnabled={interactive}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={showUserLocation && interactive}
        showsCompass={interactive}
      >
        {/* Capa base de teselas OSM (Android: única capa visible con mapType="none") */}
        {Platform.OS === "android" && (
          <UrlTile
            urlTemplate={tileUrl}
            maximumZ={19}
            flipY={false}
            tileSize={256}
            zIndex={-1}
          />
        )}

        {/* Capa de usuario: Trazado de la ruta */}
        {trail.length > 1 && (
          <Polyline
            coordinates={trail.map((pt) => ({
              latitude: pt.lat,
              longitude: pt.lng,
            }))}
            strokeColor={AndeanTheme.colors.primaryLight}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            zIndex={10}
          />
        )}

        {/* Punto de Inicio */}
        {start && (
          <Marker
            coordinate={{ latitude: start.lat, longitude: start.lng }}
            title={start.name || "Punto de Inicio"}
            description="Inicio de la caminata"
            pinColor={AndeanTheme.colors.primary}
            zIndex={20}
          >
            <View style={[styles.markerBadge, styles.startBadge]}>
              <MapPin size={14} color={AndeanTheme.colors.white} />
            </View>
          </Marker>
        )}

        {/* Punto de Destino / Fin */}
        {end && (
          <Marker
            coordinate={{ latitude: end.lat, longitude: end.lng }}
            title={end.name || "Punto de Destino"}
            description="Fin de la caminata"
            pinColor={AndeanTheme.colors.amberLight}
            zIndex={20}
          >
            <View style={[styles.markerBadge, styles.endBadge]}>
              <Flag size={14} color={AndeanTheme.colors.white} />
            </View>
          </Marker>
        )}

        {/* Puntos de interés y checkpoints */}
        {allMarkers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.name || "Checkpoint"}
            description={m.notes || m.category}
            pinColor={AndeanTheme.colors.amber}
            zIndex={15}
          />
        ))}

        {/* Posición actual del usuario si fue inyectada */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
            }}
            title="Mi Posición"
            zIndex={30}
          >
            <View style={styles.userDot}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Contenedor para overlays (botones de zoom, badge de desnivel, etc.) */}
      {children}

      {/* Atribución obligatoria por licencia de las teselas (OSM + CARTO).
          Solo en Android online: iOS usa Apple Maps y offline usa tiles propios. */}
      {Platform.OS === "android" && !offlinePackPath && (
        <View style={styles.attribution} pointerEvents="none">
          <Text style={styles.attributionText}>© OpenStreetMap · © CARTO</Text>
        </View>
      )}
    </View>
  );
};

export default TrekMap;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: AndeanTheme.borderRadius.lg,
    overflow: "hidden",
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    position: "relative",
  },
  webFallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: AndeanTheme.spacing.lg,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  webFallbackTitle: {
    color: AndeanTheme.colors.text,
    fontSize: AndeanTheme.typography.sizes.md,
    fontWeight: "700",
    marginTop: AndeanTheme.spacing.sm,
  },
  webFallbackSubtitle: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: AndeanTheme.typography.sizes.xs,
    marginTop: AndeanTheme.spacing.xs,
  },
  markerBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: AndeanTheme.colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  startBadge: {
    backgroundColor: AndeanTheme.colors.primary,
  },
  endBadge: {
    backgroundColor: AndeanTheme.colors.amberLight,
  },
  userDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(59, 130, 246, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: AndeanTheme.colors.white,
  },
  attribution: {
    position: "absolute",
    right: 6,
    bottom: 4,
    backgroundColor: "rgba(5, 23, 18, 0.6)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 9,
  },
});
