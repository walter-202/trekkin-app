import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Route as RouteIcon, Mountain } from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import type { TrekkinActivity, RouteModel } from "../../../core/domain/types";
import type { FinishActivityResult } from "../../../core/application/activity/FinishActivity.usecase";
import { RouteCard } from "../explore/RouteCard";
import { PrepareView } from "./PrepareView";
import { TrackingView } from "./TrackingView";
import { ResultView } from "./ResultView";
import { HistoryView } from "./HistoryView";
import { ActivityDetailView } from "./ActivityDetailView";
import { AndeanTheme } from "../../theme";

/**
 * HU-06 — Hub "Realizar una ruta existente".
 * Máquina de pasos manual (sin react-navigation). El catálogo de rutas
 * publicadas (mismo origen que HU-03: Firestore + seed local) permite elegir
 * qué ruta realizar; también aparece cualquier ruta nueva publicada.
 */
type Step = "boot" | "prepare" | "tracking" | "result" | "history" | "detail";

interface ActivityViewProps {
  onClose: () => void;
}

const STEP_TITLES: Record<Step, string> = {
  boot: "Realizar una ruta",
  prepare: "Preparar recorrido",
  tracking: "Actividad en curso",
  result: "Resultado",
  history: "Historial",
  detail: "Detalle de actividad",
};

export const ActivityView: React.FC<ActivityViewProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const live = useActivityStore((s) => s.live);
  const isLoading = useActivityStore((s) => s.isLoading);
  const error = useActivityStore((s) => s.error);
  const catalogRoutes = useActivityStore((s) => s.catalogRoutes);

  const [step, setStep] = useState<Step>("boot");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<TrekkinActivity | null>(null);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;
    useActivityStore.getState().loadCatalog();
  }, [currentUser]);

  useEffect(() => {
    if (step !== "boot" || !live) return;
    if (live.phase === "ready") setStep("prepare");
    else if (live.phase === "in_progress" || live.phase === "paused")
      setStep("tracking");
  }, [live, step]);

  const handleBack = () => {
    switch (step) {
      case "prepare":
        // Cancelar la selección sin iniciar y volver al catálogo.
        useActivityStore.getState().clearLive();
        setStep("boot");
        break;
      case "history":
        // Volver al resultado de la actividad recién finalizada.
        setLastSaved(useActivityStore.getState().lastResult);
        setStep("result");
        break;
      case "detail":
        setStep(lastSaved ? "result" : "history");
        break;
      default:
        onClose();
    }
  };

  const handleSelectRoute = async (route: RouteModel) => {
    const uid = currentUser?.uid;
    if (!uid || isLoading) return;
    const ok = await useActivityStore
      .getState()
      .startRoute(uid, currentUser?.displayName ?? "", route.id);
    if (!ok) return;
    // El cambio de estado `live` (ready) hace avanzar al paso prepare.
  };

  const handleFinished = (result: FinishActivityResult) => {
    setLastSaved(result.saved);
    setStep("result");
  };

  const handleGoHistory = () => {
    setLastSaved(null);
    setStep("history");
  };

  const handleViewTrack = (saved: TrekkinActivity) => {
    setLastSaved(saved);
    setDetailId(null);
    setStep("detail");
  };

  const handleSelectActivity = (id: string) => {
    setLastSaved(null);
    setDetailId(id);
    setStep("detail");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.navBtn}
        >
          <ChevronLeft size={20} color={AndeanTheme.colors.text} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <RouteIcon size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
        </View>
        <View style={styles.navBtn} />
      </View>

      {/* Hoja blanca: catálogo y todos los pasos viven sobre la hoja clara. */}
      <View style={styles.sheet}>
      {step === "boot" &&
        (isLoading && catalogRoutes.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={AndeanTheme.colors.primary} />
            <Text style={styles.muted}>Cargando catálogo de rutas…</Text>
          </View>
        ) : catalogRoutes.length > 0 ? (
          <FlatList
            data={catalogRoutes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  Elige una ruta para realizar
                </Text>
                <Text style={styles.muted}>
                  Del catálogo de rutas publicadas (HU-03). Aparecen también las
                  rutas nuevas que se publiquen.
                </Text>
                {error ? (
                  <View style={styles.demoBanner}>
                    <Text style={styles.demoText}>{error}</Text>
                  </View>
                ) : null}
                {isLoading ? (
                  <ActivityIndicator color={AndeanTheme.colors.primary} size="small" />
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <RouteCard route={item} onPress={() => handleSelectRoute(item)} />
            )}
          />
        ) : (
          <View style={styles.center}>
            <Mountain size={28} color={AndeanTheme.colors.accentWarning} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.muted}>
              Verifica la conexión e intenta nuevamente.
            </Text>
            <Pressable
              onPress={() => useActivityStore.getState().loadCatalog()}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>REINTENTAR</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.linkBtn}>
              <Text style={styles.linkText}>Volver al inicio</Text>
            </Pressable>
          </View>
        ))}

      {step === "prepare" && (
        <PrepareView
          onBegin={async () => {
            const ok = await useActivityStore.getState().beginTracking();
            if (ok) setStep("tracking");
          }}
        />
      )}

      {step === "tracking" && <TrackingView onFinish={handleFinished} />}

      {step === "result" && lastSaved && (
        <ResultView
          saved={lastSaved}
          onViewTrack={() => handleViewTrack(lastSaved)}
          onGoHistory={handleGoHistory}
          onClose={onClose}
        />
      )}

      {step === "history" && (
        <HistoryView
          onSelect={handleSelectActivity}
          onBack={() => handleBack()}
        />
      )}

      {step === "detail" &&
        (detailId ? (
          <ActivityDetailView id={detailId} onBack={() => handleBack()} />
        ) : lastSaved ? (
          <ActivityDetailView
            activity={lastSaved}
            onBack={() => handleBack()}
          />
        ) : null)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  navBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  headerTitleBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  headerTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sheet: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.sheet,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  listContent: { padding: 16, paddingBottom: 32, gap: 10 },
  listHeader: { gap: 8, marginBottom: 4 },
  listTitle: { color: AndeanTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  demoBanner: {
    backgroundColor: "rgba(250,204,21,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.35)",
    borderRadius: 12,
    padding: 10,
  },
  demoText: { color: AndeanTheme.colors.amber, fontSize: 11, lineHeight: 15 },
  muted: {
    color: AndeanTheme.colors.fieldHint,
    fontSize: 12,
    textAlign: "center",
  },
  errorText: {
    color: AndeanTheme.colors.danger,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: AndeanTheme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  linkBtn: { paddingVertical: 10 },
  linkText: { color: AndeanTheme.colors.inkSecondary, fontSize: 12 },
});
