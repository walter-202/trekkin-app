import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  Navigation,
  MapPin,
  Flag,
  Gauge,
  ListChecks,
  Play,
} from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import {
  locationService,
  type GpsPosition,
} from "../../../infrastructure/location/locationService";
import { distanceM } from "../../../core/domain/calculations";
import { formatDurationMinutes } from "../../utils/format";
import type { PlannedPoint } from "../../../core/domain/plan";
import { AndeanTheme } from "../../theme";

/**
 * HU-06 — Vista de preparación de la actividad.
 * Muestra la información de la ruta, el mapa, la ubicación actual del usuario y
 * la distancia aproximada hasta el punto de inicio.
 */
interface PrepareViewProps {
  onBegin: () => void;
  onClose?: () => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
  experto: "Experto",
};

function toPlannedPoint(p: {
  name: string;
  lat: number;
  lng: number;
}): PlannedPoint {
  return { lat: p.lat, lng: p.lng, name: p.name };
}

export const PrepareView: React.FC<PrepareViewProps> = ({ onBegin }) => {
  const live = useActivityStore((s) => s.live);
  const beginning = useActivityStore((s) => s.finishing);

  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const pos = await locationService.getCurrentPosition();
      if (!active) return;
      if (pos) {
        setPosition(pos);
      } else {
        setLocationError(
          "No se pudo obtener tu ubicación. Activa la ubicación para continuar.",
        );
      }
      setLocating(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!live) return null;
  const route = live.route;
  const fitTo = [
    ...route.waypoints,
    { lat: route.startPoint.lat, lng: route.startPoint.lng },
    { lat: route.endPoint.lat, lng: route.endPoint.lng },
  ];

  let distanceToStartKm: number | null = null;
  if (position) {
    distanceToStartKm =
      distanceM(
        { lat: position.latitude, lng: position.longitude },
        { lat: route.startPoint.lat, lng: route.startPoint.lng },
      ) / 1000;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.provisionalBadge}>
        <Text style={styles.provisionalText}>
          PROVISIONAL · se cargó la primera ruta publicada (catálogo HU-03
          pendiente)
        </Text>
      </View>

      <TrekMap
        trail={route.waypoints}
        pointsOfInterest={route.checkpoints}
        start={toPlannedPoint(route.startPoint)}
        end={toPlannedPoint(route.endPoint)}
        currentLocation={
          position
            ? {
                lat: position.latitude,
                lng: position.longitude,
              }
            : undefined
        }
        fitTo={fitTo}
        height={240}
      />

      <View style={styles.titleCard}>
        <Text style={styles.title}>{route.routeTitle}</Text>
        <View style={styles.chip}>
          <Gauge size={12} color={AndeanTheme.colors.accentWarning} />
          <Text style={styles.chipText}>
            {DIFFICULTY_LABEL[route.difficulty] ?? route.difficulty}
          </Text>
        </View>
      </View>

      {route.description ? (
        <Text style={styles.description}>{route.description}</Text>
      ) : null}

      {route.photos && route.photos.length > 0 ? (
        <Image
          source={{ uri: route.photos[0] }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.metricsCard}>
        <Text style={styles.metricRowLabel}>MÉTRICAS</Text>
        <View style={styles.metricRow}>
          <MapPin size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Distancia total</Text>
          <Text style={styles.metricValue}>
            {route.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Gauge size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Tiempo estimado</Text>
          <Text style={styles.metricValue}>
            {formatDurationMinutes(route.durationMinutes)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <MapPin size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Punto de inicio</Text>
          <Text style={styles.metricValue}>
            {route.startPoint.name} · {route.startPoint.lat.toFixed(4)},{" "}
            {route.startPoint.lng.toFixed(4)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Flag size={14} color={AndeanTheme.colors.accentWarning} />
          <Text style={styles.metricLabel}>Punto final</Text>
          <Text style={styles.metricValue}>
            {route.endPoint.name} · {route.endPoint.lat.toFixed(4)},{" "}
            {route.endPoint.lng.toFixed(4)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <ListChecks size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Checkpoints</Text>
          <Text style={styles.metricValue}>{route.checkpoints.length}</Text>
        </View>
      </View>

      <View style={styles.locationCard}>
        <Navigation size={14} color={AndeanTheme.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>TU UBICACIÓN</Text>
          {locating ? (
            <View style={styles.locationInner}>
              <ActivityIndicator color={AndeanTheme.colors.primary} size="small" />
              <Text style={styles.muted}>Ubicándote…</Text>
            </View>
          ) : locationError ? (
            <Text style={styles.locationError}>{locationError}</Text>
          ) : (
            <Text style={styles.locationValue}>
              {position?.latitude.toFixed(5)}, {position?.longitude.toFixed(5)}
            </Text>
          )}
        </View>
      </View>

      {distanceToStartKm != null && (
        <View style={styles.distanceCard}>
          <Text style={styles.distanceLabel}>
            DISTANCIA APROX. HASTA EL INICIO
          </Text>
          <Text style={styles.distanceValue}>
            {distanceToStartKm.toFixed(2)} km
          </Text>
        </View>
      )}

      <Pressable
        onPress={onBegin}
        disabled={beginning}
        style={({ pressed }) => [
          styles.beginBtn,
          pressed && styles.pressed,
          beginning && styles.beginBtnDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Iniciar actividad"
      >
        {beginning ? (
          <ActivityIndicator color="#064E3B" size="small" />
        ) : (
          <>
            <Play size={16} color="#064E3B" />
            <Text style={styles.beginText}>INICIAR ACTIVIDAD</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  provisionalBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 12,
    padding: 10,
  },
  provisionalText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  titleCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, color: AndeanTheme.colors.text, fontSize: 16, fontWeight: "900" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: { color: AndeanTheme.colors.accentWarning, fontSize: 10, fontWeight: "800" },
  description: { color: AndeanTheme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  photo: {
    width: "100%",
    height: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  metricsCard: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  metricRowLabel: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metricRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricLabel: { color: AndeanTheme.colors.textSecondary, fontSize: 11, flex: 1 },
  metricValue: {
    color: AndeanTheme.colors.text,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  locationInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: AndeanTheme.colors.textMuted,
  },
  locationValue: { color: AndeanTheme.colors.text, fontSize: 12, marginTop: 2 },
  locationError: {
    color: AndeanTheme.colors.danger,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  distanceCard: {
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  distanceLabel: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  distanceValue: { color: AndeanTheme.colors.text, fontSize: 20, fontWeight: "900" },
  beginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  beginBtnDisabled: { opacity: 0.5 },
  beginText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#064E3B",
  },
  pressed: { opacity: 0.8 },
});
