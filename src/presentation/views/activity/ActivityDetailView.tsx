import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CloudOff, Share2, Globe, Trash, RotateCcw } from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import { formatDuration, formatKm, formatDate } from "../../utils/format";
import type { TrekkinActivity } from "../../../core/domain/types";
import { shareGpxFromCoordinates } from "../../../infrastructure/share/gpxService";
import { routeService } from "../../../infrastructure/database/routeService";
import { activityService } from "../../../infrastructure/database/activityService";
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
  onPublishAndOpenCatalog?: () => void;
  onRepeatRoute?: (routeId: string) => void;
}

export const ActivityDetailView: React.FC<ActivityDetailViewProps> = ({
  id,
  activity: initialActivity,
  onBack,
  onPublishAndOpenCatalog,
  onRepeatRoute,
}) => {
  const { currentUser } = useAuth();
  const error = useActivityStore((s) => s.error);

  const [activity, setActivity] = useState<TrekkinActivity | null>(
    initialActivity ?? null,
  );
  const [loading, setLoading] = useState(initialActivity ? false : true);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const storeActivity = useActivityStore((s) =>
    activity ? s.activities.find((a) => a.id === activity.id) : null,
  );
  const displayActivity = storeActivity ?? activity;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AndeanTheme.colors.primary} />
      </View>
    );
  }

  if (!activity || !displayActivity) {
    return (
      <View style={styles.center}>
        <CloudOff size={24} color={AndeanTheme.colors.inkSecondary} />
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

  const completed = displayActivity.status === "completed";
  const routePoints = displayActivity.recordedPoints ?? [];
  const first = routePoints[0];
  const last = routePoints[routePoints.length - 1];

  const handleShareGpx = async () => {
    if (!displayActivity.recordedPoints.length) {
      Alert.alert("Sin GPX", "No hay coordenadas guardadas para exportar.");
      return;
    }

    try {
      await shareGpxFromCoordinates(displayActivity.recordedPoints, {
        name: displayActivity.routeTitle || "Ruta Trekkin",
        description: `Recorrido finalizado el ${formatDate(displayActivity.createdAt)}`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo compartir el GPX.";
      Alert.alert("No se pudo compartir", message);
    }
  };

  const handleRepeat = () => {
    if (!displayActivity.routeId) {
      Alert.alert("Ruta sin identificador", "No hay una ruta asociada para repetir.");
      return;
    }
    onRepeatRoute?.(displayActivity.routeId);
  };

  const handlePublish = async () => {
    if (!displayActivity.routeId) {
      Alert.alert("Ruta sin identificador", "No hay una ruta asociada para publicar.");
      return;
    }

    setPublishing(true);
    try {
      const publishedRoute = await routeService.publishRouteById(displayActivity.routeId);
      useActivityStore.getState().mergeCatalogRoute(publishedRoute);
      if (onPublishAndOpenCatalog) {
        onPublishAndOpenCatalog();
        return;
      }
      onBack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo publicar la ruta.";
      Alert.alert("No se pudo publicar", message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar ruta",
      "Se eliminará la ruta remota y el historial local asociado. ¿Continuas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (displayActivity.routeId) {
                await routeService.deleteRoute(displayActivity.routeId);
              }
              await activityService.deleteActivity(displayActivity.id);
              useActivityStore.setState((state) => ({
                activities: state.activities.filter(
                  (activityItem) => activityItem.id !== displayActivity.id,
                ),
              }));
              onBack();
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "No se pudo borrar la ruta.";
              Alert.alert("No se pudo eliminar", message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={styles.title}>{displayActivity.routeTitle}</Text>
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

      {!displayActivity.isSynced && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            Esta actividad se encuentra guardada en el dispositivo y se sincronizará automáticamente al detectar conexión.
          </Text>
        </View>
      )}

      <TrekMap
        trail={routePoints}
        track={routePoints}
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
        fitTo={routePoints.length >= 2 ? routePoints : []}
        height={260}
      />

      <View style={styles.metricsCard}>
        <Text style={styles.metricsLabel}>MÉTRICAS</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Distancia recorrida</Text>
          <Text style={styles.metricValue}>
            {formatKm(displayActivity.distanceCoveredKm)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Distancia restante</Text>
          <Text style={styles.metricValue}>
            {formatKm(displayActivity.remainingDistanceKm)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Duración</Text>
          <Text style={styles.metricValue}>
            {formatDuration(displayActivity.durationSeconds)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Puntos registrados</Text>
          <Text style={styles.metricValue}>
            {displayActivity.recordedPoints.length}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Fecha</Text>
          <Text style={styles.metricValue}>
            {formatDate(displayActivity.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.actionBlock}>
        <Pressable
          onPress={handleRepeat}
          style={[styles.actionBtn, styles.repeatBtn]}
          accessibilityRole="button"
          accessibilityLabel="Repetir ruta"
        >
          <RotateCcw size={16} color={AndeanTheme.colors.white} />
          <Text style={styles.actionText}>REPETIR RUTA</Text>
        </Pressable>

        <Pressable
          onPress={handlePublish}
          style={[styles.actionBtn, styles.publishBtn]}
          accessibilityRole="button"
          accessibilityLabel="Publicar ruta"
          disabled={publishing}
        >
          <Globe size={16} color={AndeanTheme.colors.white} />
          <Text style={styles.actionText}>{publishing ? "PUBLICANDO..." : "PUBLICAR"}</Text>
        </Pressable>

        <Pressable
          onPress={handleShareGpx}
          style={[styles.actionBtn, styles.shareBtn]}
          accessibilityRole="button"
          accessibilityLabel="Compartir GPX"
        >
          <Share2 size={16} color={AndeanTheme.colors.white} />
          <Text style={styles.actionText}>COMPARTIR GPX</Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          style={[styles.actionBtn, styles.deleteBtn]}
          accessibilityRole="button"
          accessibilityLabel="Eliminar ruta"
          disabled={deleting}
        >
          <Trash size={16} color={AndeanTheme.colors.white} />
          <Text style={styles.actionText}>{deleting ? "ELIMINANDO..." : "ELIMINAR"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, color: AndeanTheme.colors.ink, fontSize: 16, fontWeight: "900" },
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
    backgroundColor: AndeanTheme.colors.field,
    borderColor: AndeanTheme.colors.fieldBorder,
  },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  badgeTextCompleted: { color: AndeanTheme.colors.amber },
  badgeTextIncomplete: { color: AndeanTheme.colors.inkSecondary },
  syncBanner: {
    backgroundColor: "rgba(250,204,21,0.12)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  syncText: { color: AndeanTheme.colors.amber, fontSize: 11, lineHeight: 15 },
  metricsCard: {
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  metricsLabel: {
    color: AndeanTheme.colors.fieldHint,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metricRow: { flexDirection: "row", alignItems: "center" },
  metricKey: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, flex: 1 },
  metricValue: { color: AndeanTheme.colors.ink, fontSize: 12, fontWeight: "800" },
  actionBlock: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    minWidth: 94,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  repeatBtn: {
    backgroundColor: AndeanTheme.colors.primaryDark,
  },
  publishBtn: {
    backgroundColor: AndeanTheme.colors.primary,
  },
  shareBtn: {
    backgroundColor: AndeanTheme.colors.accentInfo,
  },
  deleteBtn: {
    backgroundColor: AndeanTheme.colors.danger,
  },
  actionText: {
    color: AndeanTheme.colors.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  muted: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, textAlign: "center" },
  retryBtn: {
    marginTop: 6,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: { color: AndeanTheme.colors.inkSecondary, fontSize: 11, fontWeight: "800" },
});
