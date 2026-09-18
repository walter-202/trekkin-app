import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft, Crosshair, AlertTriangle, X } from "lucide-react-native";
import * as Location from "expo-location";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import {
  isFreeRecording,
  isResumableLive,
} from "../../../core/domain/activity";
import {
  locationService,
  RECORDING_WATCH_OPTIONS,
} from "../../../infrastructure/location/locationService";
import type { FinishActivityResult } from "../../../core/application/activity/FinishActivity.usecase";
import type { TrekkinActivity } from "../../../core/domain/types";
import { TrackingView } from "../activity/TrackingView";
import { ResultView } from "../activity/ResultView";
import { ActivityDetailView } from "../activity/ActivityDetailView";
import { AndeanTheme } from "../../theme";

/**
 * HU-08 — Grabación libre: GRABAR RUTA sin plan, borrador ni destino.
 * locating → tracking → result → detail.
 * El punto inicial proviene del GPS actual del teléfono. Reutiliza
 * TrackingView / ResultView / store (autosave offline) sin tocar HU-06/07.
 */
type FreeStep = "locating" | "tracking" | "result" | "detail";

interface FreeRecordViewProps {
  onClose?: () => void;
}

export const FreeRecordView: React.FC<FreeRecordViewProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<FreeStep>("locating");
  const [lastSaved, setLastSaved] = useState<TrekkinActivity | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const requestFixAndStart = async () => {
    if (!currentUser || locating) return;
    setLocating(true);
    setLocError(null);
    try {
      const pos = await locationService.getCurrentPosition({
        accuracy: Location.Accuracy.High,
      });
      if (!pos) {
        setLocError(
          "No se pudo obtener tu ubicación. Concede el permiso de ubicación e inténtalo de nuevo.",
        );
        return;
      }
      const ok = await useActivityStore
        .getState()
        .startFreeRecording(
          { lat: pos.latitude, lng: pos.longitude, altitude: pos.altitude },
          currentUser.uid,
          currentUser.displayName,
        );
      if (ok) {
        setStep("tracking");
      } else {
        setLocError(
          useActivityStore.getState().error ??
            "No se pudo iniciar la grabación GPS.",
        );
      }
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    // Recupera solo grabaciones libres en curso (p. ej. tras salir y volver).
    const live = useActivityStore.getState().live;
    if (isResumableLive(live) && isFreeRecording(live)) {
      setStep("tracking");
      return;
    }
    void requestFixAndStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  const handleFinished = (result: FinishActivityResult) => {
    setLastSaved(result.saved);
    setStep("result");
  };

  const handleDone = async () => {
    await useActivityStore.getState().clearLive();
    setLastSaved(null);
    setStep("locating");
    if (onClose) onClose();
  };

  const goBack = () => {
    if (step === "tracking") {
      // No se detiene el GPS al navegar: se pausa para no perder el track.
      void useActivityStore.getState().pauseActivity();
    }
    if (onClose) onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          style={styles.headerBtn}
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={18} color={AndeanTheme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>GRABAR RUTA</Text>
        {onClose ? (
          <Pressable
            onPress={goBack}
            style={styles.headerBtn}
            accessibilityLabel="Cerrar"
          >
            <X size={18} color={AndeanTheme.colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {step === "locating" && (
        <View style={styles.center}>
          {locating ? (
            <>
              <ActivityIndicator color={AndeanTheme.colors.primary} size="large" />
              <Text style={styles.centerTitle}>
                Obteniendo tu ubicación GPS…
              </Text>
              <Text style={styles.centerText}>
                Quédate al aire libre unos segundos para un fix preciso.
              </Text>
            </>
          ) : (
            <>
              <Crosshair size={32} color={AndeanTheme.colors.textSecondary} />
              <Text style={styles.centerTitle}>Graba desde donde estás</Text>
              <Text style={styles.centerText}>
                Usaremos tu ubicación GPS actual como punto inicial. No
                necesitas planificar ni elegir destino.
              </Text>
              {locError && (
                <View style={styles.errorBanner}>
                  <AlertTriangle size={14} color={AndeanTheme.colors.danger} />
                  <Text style={styles.errorText}>{locError}</Text>
                </View>
              )}
              <Pressable
                onPress={requestFixAndStart}
                style={({ pressed }) => [
                  styles.startBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.startBtnText}>
                  OBTENER UBICACIÓN E INICIAR
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {step === "tracking" && (
        <TrackingView
          onFinish={handleFinished}
          watchOptions={RECORDING_WATCH_OPTIONS}
          mode="free"
        />
      )}

      {step === "result" && lastSaved && (
        <ResultView
          saved={lastSaved}
          onViewTrack={() => setStep("detail")}
          onGoHistory={() => setStep("detail")}
          onClose={handleDone}
        />
      )}

      {step === "detail" && lastSaved && (
        <ActivityDetailView
          activity={lastSaved}
          onBack={() => setStep("result")}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  headerTitle: { flex: 1, color: AndeanTheme.colors.text, fontSize: 15, fontWeight: "900" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  centerTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  centerText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    borderRadius: 12,
    padding: 10,
  },
  errorText: { color: AndeanTheme.colors.danger, fontSize: 11, flex: 1 },
  startBtn: {
    backgroundColor: AndeanTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  startBtnText: {
    color: "#064E3B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  pressed: { opacity: 0.8 },
});
