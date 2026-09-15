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
} from "lucide-react-native";
import type { RouteModel } from "../../../core/domain/types";
import type { OfflineRoute } from "../../../core/domain/offline";
import { formatBytes } from "../../../core/domain/offline";
import { EstimateRouteDownloadSizeUseCase } from "../../../core/application/offline/EstimateRouteDownloadSize.usecase";
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

type FlowState = "estimate" | "downloading" | "done" | "error";

/**
 * HU-04 T2–T5 + T10–T11 — Flujo "Descargar ruta":
 * 1. Botón en el detalle (T2) → modal con tamaño estimado (T3/T4).
 * 2. Confirmación (T5) → descarga mapa+trazado+info con progreso (T6–T10).
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

  const estimate = useMemo(
    () => EstimateRouteDownloadSizeUseCase(route),
    [route],
  );

  useEffect(() => {
    if (visible) {
      setFlow("estimate");
      setStage(null);
      setErrorMsg(null);
      setDoneRecord(null);
    }
  }, [visible]);

  const startDownload = async () => {
    setFlow("downloading");
    setErrorMsg(null);
    try {
      const record = await DownloadRouteOfflineUseCase(
        route,
        {
          saveMap: (id, p) => tileCacheDB.saveMap(id, p),
          saveTrail: (id, p) => tileCacheDB.saveTrail(id, p),
          saveInfo: (id, p) => tileCacheDB.saveInfo(id, p),
          finalize: (id, r) => tileCacheDB.finalize(id, r),
        },
        { onStage: (s) => setStage(s) },
      );
      setDoneRecord(record);
      setFlow("done");
      onCompleted(record);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "No se pudo descargar la ruta.");
      setFlow("error");
    }
  };

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
              <Download size={16} color={AndeanTheme.colors.primaryLight} />
              <Text style={styles.sheetTitle}>Descargar ruta</Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={flow === "downloading"}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            >
              <X size={18} color={AndeanTheme.colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.routeName}>{route.title}</Text>

          {flow === "estimate" ? (
            <>
              <Text style={styles.section}>TAMAÑO ESTIMADO</Text>
              <View style={styles.sizeBox}>
                <Text style={styles.sizeTotal}>
                  {formatBytes(estimate.totalBytes)}
                </Text>
                <Text style={styles.sizeHint}>
                  Espacio aproximado antes de confirmar la descarga.
                </Text>
              </View>
              <View style={styles.breakdown}>
                <View style={styles.breakRow}>
                  <MapPinned size={13} color={AndeanTheme.colors.primaryLight} />
                  <Text style={styles.breakLabel}>Mapa vectorial</Text>
                  <Text style={styles.breakValue}>
                    {formatBytes(estimate.mapBytes)}
                  </Text>
                </View>
                <View style={styles.breakRow}>
                  <Route size={13} color={AndeanTheme.colors.primaryLight} />
                  <Text style={styles.breakLabel}>Trazado y puntos</Text>
                  <Text style={styles.breakValue}>
                    {formatBytes(estimate.trailBytes)}
                  </Text>
                </View>
                <View style={styles.breakRow}>
                  <Info size={13} color={AndeanTheme.colors.primaryLight} />
                  <Text style={styles.breakLabel}>Información básica</Text>
                  <Text style={styles.breakValue}>
                    {formatBytes(estimate.infoBytes)}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={startDownload}
                style={styles.confirmBtn}
                accessibilityRole="button"
                accessibilityLabel="Confirmar descarga de la ruta"
              >
                <Download size={15} color="#FFFFFF" />
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
              <ActivityIndicator color={AndeanTheme.colors.primaryLight} />
              <Text style={styles.progressLabel}>{stageLabel}</Text>
              <Text style={styles.progressHint}>
                Descargando mapa, trazado e información…
              </Text>
            </View>
          ) : null}

          {flow === "done" && doneRecord ? (
            <>
              <View style={styles.doneBox}>
                <CheckCircle2 size={28} color={AndeanTheme.colors.primaryLight} />
                <Text style={styles.doneTitle}>¡Ruta descargada!</Text>
                <Text style={styles.doneHint}>
                  Disponible sin conexión en Descargas ·{" "}
                  {formatBytes(doneRecord.estimatedSizeMB * 1024 * 1024)}
                </Text>
              </View>
              <View style={styles.doneMeta}>
                <HardDrive size={12} color={AndeanTheme.colors.textMuted} />
                <Text style={styles.doneMetaText}>
                  Mapa + trazado + información básica guardados en el dispositivo.
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
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
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
  sheetTitle: { color: AndeanTheme.colors.text, fontSize: 15, fontWeight: "900" },
  routeName: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  section: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sizeBox: {
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  sizeTotal: { color: AndeanTheme.colors.primaryLight, fontSize: 24, fontWeight: "900" },
  sizeHint: { color: AndeanTheme.colors.textSecondary, fontSize: 11, textAlign: "center" },
  breakdown: { gap: 6 },
  breakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  breakLabel: { flex: 1, color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  breakValue: { color: AndeanTheme.colors.text, fontSize: 12, fontWeight: "800" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  cancelBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  cancelText: { color: AndeanTheme.colors.textSecondary, fontSize: 12, fontWeight: "800" },
  progressBox: { alignItems: "center", gap: 10, paddingVertical: 18 },
  progressLabel: { color: AndeanTheme.colors.text, fontSize: 14, fontWeight: "800" },
  progressHint: { color: AndeanTheme.colors.textMuted, fontSize: 11 },
  doneBox: { alignItems: "center", gap: 8, paddingVertical: 10 },
  doneTitle: { color: AndeanTheme.colors.text, fontSize: 16, fontWeight: "900" },
  doneHint: { color: AndeanTheme.colors.textSecondary, fontSize: 12, textAlign: "center" },
  doneMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderRadius: 10,
    padding: 10,
  },
  doneMetaText: { flex: 1, color: AndeanTheme.colors.textMuted, fontSize: 11 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.danger,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { flex: 1, color: AndeanTheme.colors.text, fontSize: 12 },
});