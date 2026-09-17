import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import {
  ChevronLeft,
  History,
  Trophy,
  Map as MapIcon,
} from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { formatDuration, formatKm, formatDate } from "../../utils/format";
import type { TrekkinActivity } from "../../../core/domain/types";

/**
 * HU-06 — Resumen de la actividad finalizada (COMPLETA / INCOMPLETA),
 * con el recorrido en el mapa y acceso al detalle y al historial.
 */
interface ResultViewProps {
  saved: TrekkinActivity;
  onViewTrack: () => void;
  onGoHistory: () => void;
  onClose: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  saved,
  onViewTrack,
  onGoHistory,
  onClose,
}) => {
  const completed = saved.status === "completed";
  const first = saved.recordedPoints[0];
  const last = saved.recordedPoints[saved.recordedPoints.length - 1];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {completed ? (
          <Trophy size={28} color="#F59E0B" />
        ) : (
          <MapIcon size={28} color="#10B981" />
        )}
        <Text style={styles.heroTitle}>
          {completed ? "¡Actividad completa!" : "Actividad guardada"}
        </Text>
        <Text style={styles.heroSubtitle}>{saved.routeTitle}</Text>
        <View
          style={[
            styles.statusChip,
            completed ? styles.statusCompleted : styles.statusIncomplete,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              completed
                ? styles.statusTextCompleted
                : styles.statusTextIncomplete,
            ]}
          >
            {completed ? "COMPLETA" : "INCOMPLETA"}
          </Text>
        </View>
      </View>

      {!saved.isSynced && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            No se pudo guardar en línea. Tu recorrido está guardado y se
            mostrará en el historial para reenviarlo.
          </Text>
        </View>
      )}

      <TrekMap
        track={saved.recordedPoints}
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
        fitTo={saved.recordedPoints}
        height={220}
      />

      <View style={styles.metricsCard}>
        <Text style={styles.metricsLabel}>RESUMEN</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Distancia recorrida</Text>
          <Text style={styles.metricValue}>
            {formatKm(saved.distanceCoveredKm)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Duración</Text>
          <Text style={styles.metricValue}>
            {formatDuration(saved.durationSeconds)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Distancia restante</Text>
          <Text style={styles.metricValue}>
            {formatKm(saved.remainingDistanceKm)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Puntos registrados</Text>
          <Text style={styles.metricValue}>{saved.recordedPoints.length}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Fecha</Text>
          <Text style={styles.metricValue}>{formatDate(saved.createdAt)}</Text>
        </View>
      </View>

      <Pressable
        onPress={onViewTrack}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Ver recorrido en detalle"
      >
        <MapIcon size={16} color="#064E3B" />
        <Text style={styles.primaryText}>VER RECORRIDO</Text>
      </Pressable>

      <Pressable
        onPress={onGoHistory}
        style={({ pressed }) => [
          styles.secondaryBtn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ir al historial"
      >
        <History size={16} color="#10B981" />
        <Text style={styles.secondaryText}>IR AL HISTORIAL</Text>
      </Pressable>

      <Pressable
        onPress={onClose}
        style={styles.linkBtn}
        accessibilityRole="button"
      >
        <ChevronLeft size={14} color="#9CA3AF" />
        <Text style={styles.linkText}>Volver al inicio</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  hero: {
    alignItems: "center",
    backgroundColor: "#0E2E24",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 16,
    paddingVertical: 20,
    gap: 6,
  },
  heroTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "900" },
  heroSubtitle: { color: "#9CA3AF", fontSize: 12 },
  statusChip: {
    marginTop: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.4)",
  },
  statusIncomplete: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.4)",
  },
  statusText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  statusTextCompleted: { color: "#F59E0B" },
  statusTextIncomplete: { color: "#10B981" },
  syncBanner: {
    backgroundColor: "rgba(250,204,21,0.12)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  syncText: { color: "#FDE68A", fontSize: 11, lineHeight: 15 },
  metricsCard: {
    backgroundColor: "#0E2E24",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  metricsLabel: {
    color: "#6EE7B7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metricRow: { flexDirection: "row", alignItems: "center" },
  metricKey: { color: "#9CA3AF", fontSize: 12, flex: 1 },
  metricValue: { color: "#F9FAFB", fontSize: 12, fontWeight: "800" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryText: {
    color: "#064E3B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A241C",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  linkText: { color: "#9CA3AF", fontSize: 12 },
  pressed: { opacity: 0.8 },
});
