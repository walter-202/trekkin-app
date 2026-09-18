import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  Pause,
  Play,
  Flag,
  CheckCircle2,
  Circle,
  ListChecks,
  MapPinPlus,
} from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { AddCheckpointModal } from "./AddCheckpointModal";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import {
  activeElapsedMs,
  ACTIVITY_CONFIG,
} from "../../../core/domain/activity";
import {
  accumulatedDistanceKm,
  remainingDistanceToEndKm,
} from "../../../core/domain/calculations";
import { formatDuration } from "../../utils/format";
import type { FinishActivityResult } from "../../../core/application/activity/FinishActivity.usecase";
import type { PlannedPoint } from "../../../core/domain/plan";
import type { CheckpointCategory } from "../../../core/domain/types";
import type { LocationAccuracyOptions } from "../../../infrastructure/location/locationService";

/**
 * HU-06 — Vista principal del recorrido.
 * Mapa en vivo con trazado oficial + recorrido realizado + posición actual;
 * HUD de DISTANCIA / TIEMPO / RESTANTE en tiempo real; checkpoints con estado;
 * botones PAUSAR / REANUDAR / FINALIZAR (con confirmación).
 */
/**
 * Modo de la vista de seguimiento.
 * - `guide` (default): ruta con destino/checkpoints (HU-06/plan HU-07).
 * - `free`: grabación libre GRABAR RUTA (sin destino ni checkpoints oficiales).
 */
export type TrackingMode = "guide" | "free";

interface TrackingViewProps {
  onFinish: (result: FinishActivityResult) => void;
  /** HU-08: High + 5 m / 2.5 s. HU-06 omite y usa Balanced. */
  watchOptions?: LocationAccuracyOptions;
  /** Modo visual. Default `guide` para no alterar HU-06/HU-07. */
  mode?: TrackingMode;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  onFinish,
  watchOptions,
  mode = "guide",
}) => {
  const live = useActivityStore((s) => s.live);
  const error = useActivityStore((s) => s.error);
  const finishing = useActivityStore((s) => s.finishing);

  const [, tick] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [gpsWarning, setGpsWarning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const current = useActivityStore.getState().live;
    if (current && current.phase === "in_progress") {
      useActivityStore
        .getState()
        .startWatch(watchOptions)
        .then((ok) => setGpsWarning(!ok));
    }
    return () => {
      useActivityStore.getState().stopWatch();
    };
  }, [watchOptions]);

  if (!live) return null;

  const startTwice = live.recordedPoints[0];
  const lastPoint = live.recordedPoints[live.recordedPoints.length - 1];
  const currentLocation: PlannedPoint | undefined = lastPoint
    ? { lat: lastPoint.lat, lng: lastPoint.lng, name: "Tu posición" }
    : startTwice
      ? { lat: startTwice.lat, lng: startTwice.lng, name: "Tu posición" }
      : undefined;

  const distanceKm = accumulatedDistanceKm(live.recordedPoints, {
    minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
    maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
  });
  const routePolyline = [
    ...live.route.waypoints,
    { lat: live.route.endPoint.lat, lng: live.route.endPoint.lng },
  ];
  const remainingKm = lastPoint
    ? remainingDistanceToEndKm(lastPoint, routePolyline)
    : live.route.distanceKm;
  const elapsedSeconds = Math.round(activeElapsedMs(live) / 1000);

  const handlePause = async () => {
    await useActivityStore.getState().pauseActivity();
  };

  const handleResume = async () => {
    const ok = await useActivityStore.getState().resumeActivity();
    if (ok) {
      const watchOk = await useActivityStore
        .getState()
        .startWatch(watchOptions);
      setGpsWarning(!watchOk);
    }
  };

  const handleAddCheckpoint = async (input: {
    name: string;
    category: CheckpointCategory;
    notes?: string;
  }) => {
    const point =
      live.recordedPoints[live.recordedPoints.length - 1] ??
      live.route.startPoint;
    if (!point) return false;
    return useActivityStore.getState().addCheckpoint({
      name: input.name,
      category: input.category,
      lat: point.lat,
      lng: point.lng,
      notes: input.notes,
    });
  };

  const handleFinalize = async () => {
    setShowConfirm(false);
    const result = await useActivityStore.getState().finishActivity();
    if (result) onFinish(result);
  };

  const visitedCount = live.completedCheckpoints.length;
  const listedCheckpoints = [
    ...live.route.checkpoints,
    ...(live.newCheckpoints ?? []),
  ];
  const totalCheckpoints = listedCheckpoints.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {gpsWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            La aplicación necesita permiso para acceder a tu ubicación.
          </Text>
        </View>
      )}

      <TrekMap
        trail={live.route.waypoints}
        track={live.recordedPoints}
        pointsOfInterest={listedCheckpoints}
        start={
          live.route
            ? {
                lat: live.route.startPoint.lat,
                lng: live.route.startPoint.lng,
                name: "Inicio",
              }
            : undefined
        }
        end={
          live.route
            ? {
                lat: live.route.endPoint.lat,
                lng: live.route.endPoint.lng,
                name: "Final",
              }
            : undefined
        }
        currentLocation={currentLocation}
        fitTo={routePolyline}
        height={300}
      />

      <View style={styles.hud}>
        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>DISTANCIA</Text>
          <Text style={styles.hudValue}>{distanceKm.toFixed(2)} km</Text>
        </View>
        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>TIEMPO</Text>
          <Text style={styles.hudValue}>{formatDuration(elapsedSeconds)}</Text>
        </View>
        {mode === "guide" && (
          <View style={styles.hudCol}>
            <Text style={styles.hudLabel}>RESTANTE</Text>
            <Text style={styles.hudValue}>{remainingKm.toFixed(2)} km</Text>
          </View>
        )}
      </View>

      {mode === "guide" && (
        <View style={styles.checkpointsCard}>
          <View style={styles.checkpointsHeader}>
            <ListChecks size={14} color="#D97706" />
            <Text style={styles.checkpointsTitle}>
              CHECKPOINTS ({visitedCount}/{totalCheckpoints})
            </Text>
          </View>
          {totalCheckpoints === 0 ? (
            <Text style={styles.muted}>
              Esta ruta no tiene checkpoints publicados.
            </Text>
          ) : (
            listedCheckpoints.map((cp) => {
              const visited = live.completedCheckpoints.includes(cp.id);
              return (
                <View key={cp.id} style={styles.checkpointRow}>
                  {visited ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : (
                    <Circle size={16} color="#4B5563" />
                  )}
                  <Text
                    style={[
                      styles.checkpointName,
                      visited && styles.checkpointNameVisited,
                    ]}
                  >
                    {cp.name}
                  </Text>
                  <Text
                    style={[
                      styles.checkpointState,
                      visited && styles.checkpointStateVisited,
                    ]}
                  >
                    {visited ? "Visitado" : "Pendiente"}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}

      <Pressable
        onPress={() => setShowCheckpoint(true)}
        disabled={live.phase === "finished"}
        style={({ pressed }) => [
          styles.checkpointBtn,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Agregar parada en la posición actual"
      >
        <MapPinPlus size={16} color="#10B981" />
        <Text style={styles.checkpointBtnText}>AGREGAR PARADA</Text>
      </Pressable>

      {live.phase === "paused" && (
        <View style={styles.pausedBanner}>
          <Text style={styles.pausedText}>
            ACTIVIDAD PAUSADA · el registro GPS está detenido
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {live.phase === "in_progress" ? (
          <Pressable
            onPress={handlePause}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pausar actividad"
          >
            <Pause size={16} color="#10B981" />
            <Text style={styles.secondaryText}>PAUSAR</Text>
          </Pressable>
        ) : (
          live.phase === "paused" && (
            <Pressable
              onPress={handleResume}
              style={({ pressed }) => [
                styles.resumeBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reanudar actividad"
            >
              <Play size={16} color="#064E3B" />
              <Text style={styles.resumeText}>REANUDAR</Text>
            </Pressable>
          )
        )}

        <Pressable
          onPress={() => setShowConfirm(true)}
          disabled={finishing}
          style={({ pressed }) => [
            styles.finishBtn,
            pressed && styles.pressed,
            finishing && styles.finishBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Finalizar actividad"
        >
          {finishing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Flag size={16} color="#FFFFFF" />
              <Text style={styles.finishText}>FINALIZAR</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              ¿Deseas finalizar la actividad?
            </Text>
            <Text style={styles.modalText}>
              Se detendrá el registro GPS y se guardará el recorrido en tu
              historial.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowConfirm(false)}
                style={({ pressed }) => [
                  styles.modalCancel,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </Pressable>
              <Pressable
                onPress={handleFinalize}
                style={({ pressed }) => [
                  styles.modalConfirm,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.modalConfirmText}>FINALIZAR</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AddCheckpointModal
        visible={showCheckpoint}
        onClose={() => setShowCheckpoint(false)}
        onSubmit={handleAddCheckpoint}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  warningBanner: {
    backgroundColor: "rgba(250,204,21,0.12)",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  warningText: { color: "#FDE68A", fontSize: 11, lineHeight: 15 },
  hud: {
    flexDirection: "row",
    backgroundColor: "#0E2E24",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 16,
    padding: 14,
  },
  hudCol: { flex: 1, alignItems: "center", gap: 4 },
  hudLabel: {
    color: "#9CA3AF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  hudValue: { color: "#F9FAFB", fontSize: 16, fontWeight: "900" },
  checkpointsCard: {
    backgroundColor: "#0E2E24",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  checkpointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  checkpointsTitle: {
    color: "#6EE7B7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  checkpointRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkpointName: { flex: 1, color: "#D1D5DB", fontSize: 12 },
  checkpointNameVisited: { color: "#6EE7B7" },
  checkpointState: { color: "#4B5563", fontSize: 10, fontWeight: "800" },
  checkpointStateVisited: { color: "#10B981" },
  pausedBanner: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  pausedText: {
    color: "#FCD34D",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  errorText: { color: "#FCA5A5", fontSize: 11, lineHeight: 15 },
  actions: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
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
  resumeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 14,
  },
  resumeText: {
    color: "#064E3B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  finishBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 14,
  },
  finishBtnDisabled: { opacity: 0.5 },
  finishText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0E2E24",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "900" },
  modalText: { color: "#9CA3AF", fontSize: 12, lineHeight: 17 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#0A241C",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalCancelText: { color: "#D1D5DB", fontSize: 11, fontWeight: "800" },
  modalConfirm: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalConfirmText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  muted: { color: "#9CA3AF", fontSize: 11 },
  checkpointBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A241C",
    borderWidth: 1,
    borderColor: "#1A4537",
    borderRadius: 14,
    paddingVertical: 12,
  },
  checkpointBtnText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
