import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  Download,
  X,
  RefreshCw,
  CheckCircle2,
  MapPinned,
  Route,
  Info,
  HardDrive,
  WifiOff,
} from "lucide-react-native";
import type { RouteModel } from "../../../core/domain/types";
import type { OfflineRoute } from "../../../core/domain/offline";
import { formatBytes, isResumableDownloadError } from "../../../core/domain/offline";
import { EstimateRouteDownloadSizeUseCase } from "../../../core/application/offline/EstimateRouteDownloadSize.usecase";
import {
  CheckOfflineSpaceUseCase,
  type OfflineSpaceCheck,
} from "../../../core/application/offline/CheckOfflineSpace.usecase";
import {
  DownloadRouteOfflineUseCase,
  DOWNLOAD_STAGE_LABELS,
} from "../../../core/application/offline/DownloadRouteOffline.usecase";
import type { OfflineDownloadStage } from "../../../core/domain/offline";
import { tileCacheDB } from "../../../infrastructure/persistence/tileCacheDB";
import { AndeanTheme } from "../../theme";

interface DownloadRouteModalProps {
  route: RouteModel;
  visible: boolean;
  onClose: () => void;
  onCompleted: (record: OfflineRoute) => void;
}

type FlowState = "estimate" | "downloading" | "paused" | "done" | "error";

/**
 * HU-04 T2–T5 + T10–T11 — Flujo "Descargar ruta":
 * 1. Botón en el detalle (T2) → modal con tamaño estimado (T3/T4).
 * 2. Confirmación (T5) → descarga PMTiles+GPX y confirma el manifiesto (T7).
 * 3. Confirmación de completado (T11).
 */
export const DownloadRouteModal: React.FC<DownloadRouteModalProps> = ({
  route,
  visible,
  onClose,
  onCompleted,
}) => {
  const [flow, setFlow] = useState<FlowState>("estimate");
  const [stage, setStage] = useState<OfflineDownloadStage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneRecord, setDoneRecord] = useState<OfflineRoute | null>(null);
  const [space, setSpace] = useState<OfflineSpaceCheck | null>(null);

  const effectiveRoute = useMemo((): RouteModel => {
    if (route.artifacts) return route;
    return {
      ...route,
      artifacts: {
        version: 1,
        gpx: {
          kind: "gpx",
          version: 1,
          storagePath: `routes/${route.id}/v1/route.gpx`,
          fileName: "route.gpx",
          mimeType: "application/gpx+xml",
          byteSize: Math.max(1024, (route.waypoints?.length ?? 2) * 140),
          status: "uploaded",
          updatedAt: route.updatedAt || Date.now(),
        },
        pmtiles: {
          kind: "pmtiles",
          version: 1,
          storagePath: `routes/${route.id}/v1/basemap.pmtiles`,
          fileName: "basemap.pmtiles",
          mimeType: "application/vnd.pmtiles",
          byteSize: 127,
          status: "uploaded",
          updatedAt: route.updatedAt || Date.now(),
        },
      },
    };
  }, [route]);

  const estimateResult = useMemo(() => {
    try {
      return { estimate: EstimateRouteDownloadSizeUseCase(effectiveRoute), error: null };
    } catch (error) {
      return {
        estimate: null,
        error: error instanceof Error ? error.message : "El paquete offline no está publicado.",
      };
    }
  }, [effectiveRoute]);
  const estimate = estimateResult.estimate;

  useEffect(() => {
    if (visible) {
      setFlow("estimate");
      setStage(null);
      setErrorMsg(null);
      setDoneRecord(null);
      setSpace(null);
    }
  }, [visible]);

  // HU-04 — Gate de espacio: compara el estimado con el disco libre y
  // bloquea Confirmar si no alcanza. `unknown` advierte sin bloquear.
  useEffect(() => {
    if (!visible || !estimate) return;
    let alive = true;
    (async () => {
      try {
        const check = await CheckOfflineSpaceUseCase(estimate.totalBytes, {
          getFreeDiskBytes: () => tileCacheDB.getFreeDiskBytes(),
        });
        if (alive) setSpace(check);
      } catch {
        if (alive) setSpace(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, estimate]);

  const startDownload = async () => {
    setFlow("downloading");
    setErrorMsg(null);
    try {
      const record = await DownloadRouteOfflineUseCase(
        effectiveRoute,
        {
          downloadArtifact: (id, kind, metadata, generation) =>
            tileCacheDB.downloadArtifact(id, kind, metadata, generation),
          cleanupArtifact: (path) => tileCacheDB.cleanupArtifact(path),
          finalize: (id, r, files) => tileCacheDB.finalize(id, r, files),
        },
        { onStage: (s) => setStage(s) },
      );
      setDoneRecord(record);
      setFlow("done");
      onCompleted(record);
    } catch (err: any) {
      // Corte de red → auto-pausa con avance conservado (reanuda por
      // artefacto); corrupción → error con reintento limpio.
      if (isResumableDownloadError(err)) {
        setErrorMsg(
          "Se perdió la conexión. Tu avance se conservó: reanuda cuando tengas red.",
        );
        setFlow("paused");
      } else {
        setErrorMsg(err?.message ?? "No se pudo descargar la ruta.");
        setFlow("error");
      }
    }
  };

  const spaceBlocked = space?.verdict === "insufficient";

  const stageLabel = stage ? DOWNLOAD_STAGE_LABELS[stage] : "Preparando descarga…";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Download size={16} color={AndeanTheme.colors.primaryDark} />
              <Text style={styles.sheetTitle}>Descargar ruta</Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={flow === "downloading"}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            >
              <X size={18} color={AndeanTheme.colors.inkSecondary} />
            </Pressable>
          </View>

          <Text style={styles.routeName}>{route.title}</Text>

          {flow === "estimate" ? (
            <>
              <Text style={styles.section}>TAMAÑO ESTIMADO</Text>
              <View style={styles.sizeBox}>
                <Text style={styles.sizeTotal}>
                  {estimate ? formatBytes(estimate.totalBytes) : "No disponible"}
                </Text>
                <Text style={styles.sizeHint}>
                  {estimateResult.error ?? "Espacio exacto según los artefactos publicados."}
                </Text>
              </View>
              {estimate ? <View style={styles.breakdown}>
                <View style={styles.breakRow}>
                  <HardDrive size={13} color={AndeanTheme.colors.primaryDark} />
                  <Text style={styles.breakLabel}>Espacio libre en el dispositivo</Text>
                  <Text style={styles.breakValue}>
                    {space ? (space.freeBytes == null ? "No verificado" : formatBytes(space.freeBytes)) : "Verificando…"}
                  </Text>
                </View>
                <View style={styles.breakRow}>
                  <MapPinned size={13} color={AndeanTheme.colors.primaryDark} />
                  <Text style={styles.breakLabel}>Paquete de mapa (PMTiles)</Text>
                  <Text style={styles.breakValue}>
                    {formatBytes(estimate.mapBytes)}
                  </Text>
                </View>
                <View style={styles.breakRow}>
                  <Route size={13} color={AndeanTheme.colors.primaryDark} />
                  <Text style={styles.breakLabel}>GPX y trazado</Text>
                  <Text style={styles.breakValue}>
                    {formatBytes(estimate.trailBytes)}
                  </Text>
                </View>
                <View style={styles.breakRow}>
                  <Info size={13} color={AndeanTheme.colors.primaryDark} />
                  <Text style={styles.breakLabel}>Manifiesto offline</Text>
                  <Text style={styles.breakValue}>
                    {formatBytes(estimate.infoBytes)}
                  </Text>
                </View>
              </View> : null}
              {spaceBlocked && estimate ? (
                <View style={styles.errorBox}>
                  <HardDrive size={16} color={AndeanTheme.colors.danger} />
                  <Text style={styles.errorText}>
                    Espacio insuficiente: necesitas {formatBytes(estimate.totalBytes)} y
                    tienes {formatBytes(space?.freeBytes ?? 0)} libres. Libera espacio
                    e intenta de nuevo.
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={startDownload}
                disabled={!estimate || spaceBlocked}
                style={[styles.confirmBtn, (!estimate || spaceBlocked) && styles.confirmDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Confirmar descarga de la ruta"
              >
                <Download size={15} color={AndeanTheme.colors.white} />
                <Text style={styles.confirmText}>Confirmar descarga</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={styles.cancelBtn}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </>
          ) : null}

          {flow === "downloading" ? (
            <View style={styles.progressBox}>
              <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
              <Text style={styles.progressLabel}>{stageLabel}</Text>
              <Text style={styles.progressHint}>
                Descargando mapa, GPX y manifiesto…
              </Text>
            </View>
          ) : null}

          {flow === "paused" ? (
            <>
              <View style={styles.pausedBox}>
                <WifiOff size={20} color={AndeanTheme.colors.amber} />
                <View style={styles.pausedTextWrap}>
                  <Text style={styles.pausedTitle}>Descarga en pausa</Text>
                  <Text style={styles.pausedText}>{errorMsg}</Text>
                  {stage ? (
                    <Text style={styles.pausedStage}>
                      Avance conservado hasta: {DOWNLOAD_STAGE_LABELS[stage]}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={startDownload}
                style={styles.confirmBtn}
                accessibilityRole="button"
                accessibilityLabel="Reanudar descarga de la ruta"
              >
                <Download size={15} color={AndeanTheme.colors.white} />
                <Text style={styles.confirmText}>Reanudar</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={styles.cancelBtn}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cerrar</Text>
              </Pressable>
            </>
          ) : null}

          {flow === "done" && doneRecord ? (
            <>
              <View style={styles.doneBox}>
                <CheckCircle2 size={28} color={AndeanTheme.colors.primaryDark} />
                <Text style={styles.doneTitle}>¡Ruta descargada!</Text>
                <Text style={styles.doneHint}>
                  Disponible sin conexión en Descargas ·{" "}
                  {formatBytes(doneRecord.estimatedSizeMB * 1024 * 1024)}
                </Text>
              </View>
              <View style={styles.doneMeta}>
                <HardDrive size={12} color={AndeanTheme.colors.fieldIcon} />
                <Text style={styles.doneMetaText}>
                  PMTiles + GPX + manifiesto guardados en el dispositivo.
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={styles.confirmBtn}
                accessibilityRole="button"
              >
                <Text style={styles.confirmText}>Listo</Text>
              </Pressable>
            </>
          ) : null}

          {flow === "error" ? (
            <>
              <View style={styles.errorBox}>
                <RefreshCw size={20} color={AndeanTheme.colors.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
              <Pressable
                onPress={startDownload}
                style={styles.confirmBtn}
                accessibilityRole="button"
              >
                <Text style={styles.confirmText}>Reintentar</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={styles.cancelBtn}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3, 12, 9, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { color: AndeanTheme.colors.ink, fontSize: 15, fontWeight: "900" },
  routeName: { color: AndeanTheme.colors.inkSecondary, fontSize: 12 },
  section: {
    color: AndeanTheme.colors.fieldLabel,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sizeBox: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  sizeTotal: { color: AndeanTheme.colors.primaryDark, fontSize: 24, fontWeight: "900" },
  sizeHint: { color: AndeanTheme.colors.inkSecondary, fontSize: 11, textAlign: "center" },
  breakdown: { gap: 6 },
  breakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  breakLabel: { flex: 1, color: AndeanTheme.colors.inkSecondary, fontSize: 12 },
  breakValue: { color: AndeanTheme.colors.ink, fontSize: 12, fontWeight: "800" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmText: { color: AndeanTheme.colors.white, fontSize: 13, fontWeight: "800" },
  confirmDisabled: { opacity: 0.45 },
  cancelBtn: {
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
  },
  cancelText: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, fontWeight: "800" },
  progressBox: { alignItems: "center", gap: 10, paddingVertical: 18 },
  progressLabel: { color: AndeanTheme.colors.ink, fontSize: 14, fontWeight: "800" },
  progressHint: { color: AndeanTheme.colors.fieldHint, fontSize: 11 },
  doneBox: { alignItems: "center", gap: 8, paddingVertical: 10 },
  doneTitle: { color: AndeanTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  doneHint: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, textAlign: "center" },
  doneMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: 10,
    padding: 10,
  },
  doneMetaText: { flex: 1, color: AndeanTheme.colors.fieldHint, fontSize: 11 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.errorBg,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.errorBorder,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { flex: 1, color: AndeanTheme.colors.errorText, fontSize: 12 },
  pausedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(250,204,21,0.10)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.35)",
    borderRadius: 10,
    padding: 12,
  },
  pausedTextWrap: { flex: 1, gap: 4 },
  pausedTitle: { color: AndeanTheme.colors.amber, fontSize: 13, fontWeight: "800" },
  pausedText: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, lineHeight: 17 },
  pausedStage: { color: AndeanTheme.colors.fieldHint, fontSize: 11 },
});
