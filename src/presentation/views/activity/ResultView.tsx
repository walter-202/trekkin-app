import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import {
  ChevronLeft,
  History,
  Trophy,
  Map as MapIcon,
  Share2,
  Save,
  CheckCircle2,
} from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { formatDuration, formatKm, formatDate } from "../../utils/format";
import {
  calculatePaceMinPerKm,
  calculateSpeedKmh,
  calculateElevationDeltaM,
  suggestRouteDifficulty,
} from "../../../core/domain/calculations";
import { ExportTrackFileUseCase } from "../../../core/application/activity/ExportTrackFile.usecase";
import { shareService } from "../../../infrastructure/share/shareService";
import { usePlanStore } from "../../../infrastructure/persistence/usePlanStore";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import { routeService } from "../../../infrastructure/database/routeService";
import type { TrekkinActivity } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

/**
 * HU-06 — Resumen de la actividad finalizada (COMPLETA / INCOMPLETA),
 * con el recorrido en el mapa y acceso al detalle y al historial.
 */
interface ResultViewProps {
  saved: TrekkinActivity;
  onViewTrack: () => void;
  onGoHistory?: () => void;
  onClose: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  saved: initialSaved,
  onViewTrack,
  onGoHistory,
  onClose,
}) => {
  const storeActivity = useActivityStore((s) =>
    s.activities.find((a) => a.id === initialSaved.id) ??
    (s.lastResult?.id === initialSaved.id ? s.lastResult : null)
  );
  const saved = storeActivity ?? initialSaved;
  const completed = saved.status === "completed";
  const first = saved.recordedPoints[0];
  const last = saved.recordedPoints[saved.recordedPoints.length - 1];
  const elevation = calculateElevationDeltaM(saved.recordedPoints);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const plan = usePlanStore((s) => s.plan);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlanSuccess, setSavedPlanSuccess] = useState(false);

  const canUpdatePlan =
    Boolean(plan?.id) &&
    (plan?.id === saved.routeId || saved.routeId?.startsWith("plan-")) &&
    saved.recordedPoints.length > 0;

  const handleUpdatePlannedRoute = async () => {
    if (!plan?.id) return;
    setSavingPlan(true);
    try {
      const difficulty = suggestRouteDifficulty(
        saved.distanceCoveredKm,
        elevation.gainM,
      );
      await routeService.updateRoute(plan.id, {
        waypoints: saved.recordedPoints,
        distanceKm: saved.distanceCoveredKm,
        durationMinutes: Math.max(1, Math.round(saved.durationSeconds / 60)),
        difficulty,
        status: "in_review",
        updatedAt: Date.now(),
      });
      setSavedPlanSuccess(true);
      Alert.alert(
        "Ruta actualizada",
        "Tu ruta planificada se actualizó con los puntos GPS reales y quedó enviada para revisión.",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar la ruta.";
      Alert.alert("Error", msg);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleExportGpx = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const file = ExportTrackFileUseCase(saved);
      await shareService.shareGpxFile(file.fileName, file.content);
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "No se pudo exportar el GPX.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {completed ? (
          <Trophy size={28} color={AndeanTheme.colors.accentWarning} />
        ) : (
          <MapIcon size={28} color={AndeanTheme.colors.primary} />
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

      {saved.isSynced ? (
        <View style={styles.syncSuccessBanner}>
          <CheckCircle2 size={15} color={AndeanTheme.colors.primary} />
          <Text style={styles.syncSuccessText}>
            Recorrido guardado y sincronizado en la nube
          </Text>
        </View>
      ) : (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>
            Guardado en el dispositivo. Se sincronizará en la nube automáticamente cuando haya conexión.
          </Text>
        </View>
      )}

      <TrekMap
        trail={saved.recordedPoints}
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
        <Text style={styles.metricsLabel}>RESUMEN DEL RECORRIDO</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Distancia recorrida</Text>
          <Text style={styles.metricValue}>
            {formatKm(saved.distanceCoveredKm)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Duración activa</Text>
          <Text style={styles.metricValue}>
            {formatDuration(saved.durationSeconds)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Velocidad promedio</Text>
          <Text style={styles.metricValue}>
            {calculateSpeedKmh(
              saved.distanceCoveredKm,
              saved.durationSeconds,
            )}{" "}
            km/h
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Ritmo promedio</Text>
          <Text style={styles.metricValue}>
            {calculatePaceMinPerKm(
              saved.distanceCoveredKm,
              saved.durationSeconds,
            )}{" "}
            min/km
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Desnivel estimado</Text>
          <Text style={styles.metricValue}>
            +{elevation.gainM} / −{elevation.lossM} m
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Dificultad estimada</Text>
          <Text style={styles.metricValue}>
            {suggestRouteDifficulty(
              saved.distanceCoveredKm,
              elevation.gainM,
            ).toUpperCase()}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricKey}>Paradas visitadas</Text>
          <Text style={styles.metricValue}>
            {saved.completedCheckpoints?.length ?? 0}
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

      {exportError ? (
        <Text style={styles.exportError}>{exportError}</Text>
      ) : null}

      {canUpdatePlan ? (
        <Pressable
          onPress={handleUpdatePlannedRoute}
          disabled={savingPlan || savedPlanSuccess}
          style={({ pressed }) => [
            styles.planBtn,
            pressed && styles.pressed,
            savedPlanSuccess && styles.planBtnSuccess,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Guardar trazado en mi ruta planificada"
        >
          {savedPlanSuccess ? (
            <CheckCircle2 size={16} color={AndeanTheme.colors.primary} />
          ) : (
            <Save size={16} color={AndeanTheme.colors.text} />
          )}
          <Text style={styles.planBtnText}>
            {savingPlan
              ? "GUARDANDO EN RUTA…"
              : savedPlanSuccess
                ? "RUTA ACTUALIZADA (EN REVISIÓN)"
                : "ACTUALIZAR RUTA PLANIFICADA"}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={handleExportGpx}
        disabled={exporting || saved.recordedPoints.length === 0}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Exportar recorrido GPX"
      >
        <Share2 size={16} color="#064E3B" />
        <Text style={styles.primaryText}>
          {exporting ? "EXPORTANDO…" : "EXPORTAR GPX"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onViewTrack}
        style={({ pressed }) => [
          styles.secondaryBtn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ver recorrido en detalle"
      >
        <MapIcon size={16} color={AndeanTheme.colors.textSecondary} />
        <Text style={styles.secondaryText}>VER RECORRIDO</Text>
      </Pressable>

      {onGoHistory ? (
        <Pressable
          onPress={onGoHistory}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ir al historial"
        >
          <History size={16} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.secondaryText}>IR AL HISTORIAL</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onClose}
        style={styles.linkBtn}
        accessibilityRole="button"
      >
        <ChevronLeft size={14} color={AndeanTheme.colors.textSecondary} />
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
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 16,
    paddingVertical: 20,
    gap: 6,
  },
  heroTitle: { color: AndeanTheme.colors.text, fontSize: 18, fontWeight: "900" },
  heroSubtitle: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
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
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: AndeanTheme.colors.borderLight,
  },
  statusText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  statusTextCompleted: { color: AndeanTheme.colors.accentWarning },
  statusTextIncomplete: { color: AndeanTheme.colors.textSecondary },
  syncBanner: {
    backgroundColor: "rgba(250,204,21,0.12)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  syncText: { color: "#FDE68A", fontSize: 11, lineHeight: 15 },
  syncSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderRadius: 12,
    padding: 10,
  },
  syncSuccessText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: "700",
  },
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
  exportError: { color: AndeanTheme.colors.danger, fontSize: 11, textAlign: "center" },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 14,
    paddingVertical: 14,
  },
  planBtnSuccess: {
    borderColor: AndeanTheme.colors.primary,
  },
  planBtnText: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.primary,
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
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryText: {
    color: AndeanTheme.colors.textSecondary,
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
  linkText: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  pressed: { opacity: 0.8 },
});
