import React, { useEffect, useMemo, useState } from "react";
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
  AlertTriangle,
} from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { AddCheckpointModal } from "./AddCheckpointModal";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import { tileCacheDB } from "../../../infrastructure/persistence/tileCacheDB";
import {
  activeElapsedMs,
  ACTIVITY_CONFIG,
} from "../../../core/domain/activity";
import {
  accumulatedDistanceKm,
  haversineKm,
  projectOnPolyline,
  remainingDistanceToEndKm,
} from "../../../core/domain/calculations";
import { formatDuration } from "../../utils/format";
import type { FinishActivityResult } from "../../../core/application/activity/FinishActivity.usecase";
import type { PlannedPoint } from "../../../core/domain/plan";
import type { CheckpointCategory } from "../../../core/domain/types";
import {
  locationService,
  type LocationAccuracyOptions,
} from "../../../infrastructure/location/locationService";
import { AndeanTheme } from "../../theme";

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
  const gpsStats = useActivityStore((s) => s.gpsStats);
  const gpsEvents = useActivityStore((s) => s.gpsEvents);

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

  const [compassHeading, setCompassHeading] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    let watch: { remove: () => void } | null = null;
    let mounted = true;
    void locationService
      .watchHeading((deg) => {
        if (mounted) setCompassHeading(deg);
      })
      .then((sub) => {
        if (!mounted) {
          sub?.remove();
        } else {
          watch = sub;
        }
      });
    return () => {
      mounted = false;
      watch?.remove();
    };
  }, []);

  if (!live) return null;

  const startTwice = live.recordedPoints[0];
  const lastPoint = live.recordedPoints[live.recordedPoints.length - 1];
  const currentLocation = lastPoint
    ? {
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        heading: compassHeading,
        name: "Tu posición",
      }
    : startTwice
      ? {
          lat: startTwice.lat,
          lng: startTwice.lng,
          heading: compassHeading,
          name: "Tu posición",
        }
      : undefined;

  const distanceKm =
    live.totalDistanceKm ??
    accumulatedDistanceKm(live.recordedPoints, {
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

  // Soporte de mapa offline (PMTiles) si la ruta fue descargada previamente
  const [offlinePackPath, setOfflinePackPath] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    const routeId = live?.route?.routeId;
    if (!routeId) return;
    tileCacheDB
      .get(routeId)
      .then((record) => {
        if (record?.pmtilesPath) {
          setOfflinePackPath(record.pmtilesPath);
        }
      })
      .catch(() => {});
  }, [live?.route?.routeId]);

  // Detección de desvío sobre la ruta oficial del creador
  const isGuided = live.route.waypoints.length >= 2;
  const deviation = useMemo(() => {
    if (!isGuided || !lastPoint) return { isOffRoute: false, meters: 0 };
    const proj = projectOnPolyline(lastPoint, routePolyline);
    const meters = Math.round(haversineKm(lastPoint, proj.projection) * 1000);
    return { isOffRoute: meters > 50, meters };
  }, [isGuided, lastPoint, routePolyline]);

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

  const handleFinalize = async () => {
    setShowConfirm(false);
    const result = await useActivityStore.getState().finishActivity();
    if (result) onFinish(result);
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
            No se pudo activar el GPS (permiso denegado o servicio
            indisponible). Revísalo y reintenta.
          </Text>
          <Pressable
            onPress={async () => {
              const ok = await useActivityStore
                .getState()
                .startWatch(watchOptions);
              setGpsWarning(!ok);
            }}
            style={styles.warningRetry}
            accessibilityRole="button"
            accessibilityLabel="Reintentar activación del GPS"
          >
            <Text style={styles.warningRetryText}>REINTENTAR GPS</Text>
          </Pressable>
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
        offlinePackPath={offlinePackPath}
        height={300}
      />

      <View style={styles.mapLegend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendIndicator,
              { backgroundColor: AndeanTheme.colors.primaryLight },
            ]}
          />
          <Text style={styles.legendText}>Ruta creador</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendIndicator,
              { backgroundColor: AndeanTheme.colors.trackOrange },
            ]}
          />
          <Text style={styles.legendText}>Tu trazado</Text>
        </View>
        {offlinePackPath ? (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBadgeDot,
                { backgroundColor: AndeanTheme.colors.primary },
              ]}
            />
            <Text style={styles.legendBadgeText}>Offline</Text>
          </View>
        ) : (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBadgeDot,
                { backgroundColor: AndeanTheme.colors.amberLight },
              ]}
            />
            <Text style={styles.legendBadgeText}>Online</Text>
          </View>
        )}
      </View>

      {/* Diagnóstico GPS (P0-3): visibilidad de por qué entra/sale cada fix. */}
      <View style={styles.diagBox}>
        <Text style={styles.diagText}>
          GPS recibidos: {gpsStats.received} | aceptados: {gpsStats.accepted} |
          accuracy: {gpsStats.discardedAccuracy} | near:{" "}
          {gpsStats.discardedTooClose} | far: {gpsStats.discardedTooFar} |
          invalid: {gpsStats.discardedInvalid}
        </Text>
        <Text style={styles.diagText}>
          últ: {gpsStats.lastReason ?? "—"}
          {gpsEvents.length > 0
            ? ` · ${gpsEvents[gpsEvents.length - 1].t} ${gpsEvents[gpsEvents.length - 1].type}`
            : ""}
        </Text>
      </View>

      {mode === "guide" && deviation.isOffRoute && (
        <View style={styles.offRouteBanner}>
          <AlertTriangle size={15} color={AndeanTheme.colors.amber} />
          <Text style={styles.offRouteText}>
            Atención: te encuentras a{" "}
            {deviation.meters >= 1000
              ? `${(deviation.meters / 1000).toFixed(2)} km`
              : `${deviation.meters} m`}{" "}
            del sendero oficial.{" "}
            {deviation.meters > 500 && offlinePackPath
              ? "(El mapa offline cubre el área del sendero; aproxímate a la ruta para centrar tu posición)."
              : ""}
          </Text>
        </View>
      )}

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
            <ListChecks size={14} color={AndeanTheme.colors.accentWarning} />
            <Text style={styles.checkpointsTitle}>
              CHECKPOINTS ({visitedCount}/{totalCheckpoints})
            </Text>
          </View>
          {totalCheckpoints === 0 ? (
            <Text style={styles.muted}>
              Aún no hay paradas. Agrega una en tu posición actual.
            </Text>
          ) : (
            listedCheckpoints.map((cp) => {
              const visited = live.completedCheckpoints.includes(cp.id);
              return (
                <View key={cp.id} style={styles.checkpointRow}>
                  {visited ? (
                    <CheckCircle2
                      size={16}
                      color={AndeanTheme.colors.primary}
                    />
                  ) : (
                    <Circle size={16} color={AndeanTheme.colors.fieldIcon} />
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
        <MapPinPlus size={16} color={AndeanTheme.colors.primary} />
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
            <Pause size={16} color={AndeanTheme.colors.inkSecondary} />
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
              <Play size={16} color={AndeanTheme.colors.white} />
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
            <ActivityIndicator color={AndeanTheme.colors.white} size="small" />
          ) : (
            <>
              <Flag size={16} color={AndeanTheme.colors.white} />
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
  warningText: {
    color: AndeanTheme.colors.amber,
    fontSize: 11,
    lineHeight: 15,
  },
  warningRetry: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warningRetryText: {
    color: AndeanTheme.colors.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  diagBox: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  diagText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 10,
    lineHeight: 14,
    fontVariant: ["tabular-nums"],
  },
  hud: {
    flexDirection: "row",
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 14,
  },
  hudCol: { flex: 1, alignItems: "center", gap: 4 },
  hudLabel: {
    color: AndeanTheme.colors.fieldHint,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  hudValue: { color: AndeanTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  checkpointsCard: {
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
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
    color: AndeanTheme.colors.fieldHint,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  checkpointRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkpointName: {
    flex: 1,
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
  },
  checkpointNameVisited: { color: AndeanTheme.colors.ink },
  checkpointState: {
    color: AndeanTheme.colors.fieldHint,
    fontSize: 10,
    fontWeight: "800",
  },
  checkpointStateVisited: { color: AndeanTheme.colors.primaryDark },
  pausedBanner: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  pausedText: {
    color: AndeanTheme.colors.amber,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: AndeanTheme.colors.errorBg,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.errorBorder,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: AndeanTheme.colors.errorText,
    fontSize: 11,
    lineHeight: 15,
  },
  actions: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryText: {
    color: AndeanTheme.colors.inkSecondary,
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
    backgroundColor: AndeanTheme.colors.cta,
    borderRadius: 14,
    paddingVertical: 14,
  },
  resumeText: {
    color: AndeanTheme.colors.white,
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
    backgroundColor: AndeanTheme.colors.danger,
    borderRadius: 14,
    paddingVertical: 14,
  },
  finishBtnDisabled: { opacity: 0.5 },
  finishText: {
    color: AndeanTheme.colors.white,
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
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    color: AndeanTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  modalText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalCancelText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  modalConfirm: {
    flex: 1,
    alignItems: "center",
    backgroundColor: AndeanTheme.colors.danger,
    borderRadius: 14,
    paddingVertical: 12,
  },
  modalConfirmText: {
    color: AndeanTheme.colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  pressed: { opacity: 0.8 },
  muted: { color: AndeanTheme.colors.fieldHint, fontSize: 11 },
  checkpointBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 14,
    paddingVertical: 12,
  },
  checkpointBtnText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  mapLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: -8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendIndicator: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  legendBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  legendBadgeText: {
    color: AndeanTheme.colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
  },
  offRouteBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.amber,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  offRouteText: {
    color: AndeanTheme.colors.amber,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
});
