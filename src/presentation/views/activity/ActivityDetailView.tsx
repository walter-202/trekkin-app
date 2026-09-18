import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { CloudOff } from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import { formatDuration, formatKm, formatDate } from "../../utils/format";
import type { TrekkinActivity } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

/**
 * HU-06 — Detalle de una actividad ya realizada (desde el historial o el resumen).
 * Muestra el recorrido registrado en el mapa y las métricas finales.
 * Puede recibir la actividad directamente (`activity`) o su id para cargarla
 * desde local/Firestore (`id`).
 */
interface ActivityDetailViewProps {
  id?: string;
  activity?: TrekkinActivity;
  onBack: () => void;
}

export const ActivityDetailView: React.FC<ActivityDetailViewProps> = ({
  id,
  activity: initialActivity,
  onBack,
}) => {
  const { currentUser } = useAuth();
  const error = useActivityStore((s) => s.error);

  const [activity, setActivity] = useState<TrekkinActivity | null>(
    initialActivity ?? null,
  );
  const [loading, setLoading] = useState(initialActivity ? false : true);

  useEffect(() => {
    if (initialActivity) {
      setActivity(initialActivity);
      setLoading(false);
      return;
    }
    const uid = currentUser?.uid;
    if (!uid || !id) return;
    (async () => {
      const result = await useActivityStore.getState().loadActivity(id, uid);
      setActivity(result);
      setLoading(false);
    })();
  }, [currentUser, id, initialActivity]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AndeanTheme.colors.primary} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.center}>
        <CloudOff size={24} color={AndeanTheme.colors.textSecondary} />
        <Text style={styles.muted}>
          {error ?? "No se pudo cargar la actividad."}
        </Text>
        <Pressable
          onPress={onBack}
          style={styles.retryBtn}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>VOLVER</Text>
        </Pressable>
      </View>
    );
  }

  const completed = activity.status === "completed";
  const first = activity.recordedPoints[0];
  const last = activity.recordedPoints[activity.recordedPoints.length - 1];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.title}>{activity.routeTitle}</Text>
        <View
          style={[
            styles.badge,
            completed ? styles.badgeCompleted : styles.badgeIncomplete,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              completed
                ? styles.badgeTextCompleted
                : styles.badgeTextIncomplete,
            ]}
          >
            {completed ? "COMPLETA" : "INCOMPLETA"}
          </Text>
        </View>
      </View>

      {!activity.isSynced && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            Esta actividad aún no se sincroniza con la nube (conexión
            restringida).
          </Text>
        </View>
      )}

      <TrekMap
        track={activity.recordedPoints}
        start={
          first
            ? { lat: first.lat, lng: first.lng, name: "Inicio del recorrido" }
            : undefined
        }
        end={
          last
            ? { lat: last.lat, lng: last.lng, name: "Fin del recorrido" }
            : undefined
        }
        fitTo={activity.recordedPoints}
        height={260}
      />

      <View style={styles.metricsCard}>
        <Text style={styles.metricsLabel}>MÉTRICAS</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Distancia recorrida</Text>
          <Text style={styles.metricValue}>
            {formatKm(activity.distanceCoveredKm)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Distancia restante</Text>
          <Text style={styles.metricValue}>
            {formatKm(activity.remainingDistanceKm)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Duración</Text>
          <Text style={styles.metricValue}>
            {formatDuration(activity.durationSeconds)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Puntos registrados</Text>
          <Text style={styles.metricValue}>
            {activity.recordedPoints.length}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Fecha</Text>
          <Text style={styles.metricValue}>
            {formatDate(activity.createdAt)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, color: AndeanTheme.colors.text, fontSize: 16, fontWeight: "900" },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeCompleted: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.4)",
  },
  badgeIncomplete: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: AndeanTheme.colors.borderLight,
  },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  badgeTextCompleted: { color: AndeanTheme.colors.accentWarning },
  badgeTextIncomplete: { color: AndeanTheme.colors.textSecondary },
  syncBanner: {
    backgroundColor: "rgba(250,204,21,0.12)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  syncText: { color: "#FDE68A", fontSize: 11, lineHeight: 15 },
  metricsCard: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  metricsLabel: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metricRow: { flexDirection: "row", alignItems: "center" },
  metricKey: { color: AndeanTheme.colors.textSecondary, fontSize: 12, flex: 1 },
  metricValue: { color: AndeanTheme.colors.text, fontSize: 12, fontWeight: "800" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12, textAlign: "center" },
  retryBtn: {
    marginTop: 6,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: { color: AndeanTheme.colors.text, fontSize: 11, fontWeight: "800" },
});
