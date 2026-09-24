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
import {
  seedQualityCheck,
  type FreeRecordingPosition,
} from "../../../core/application/activity/StartFreeRecording.usecase";
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
      // P0-2: distinguir permiso denegado de fix no disponible (iOS/Expo Go).
      const hasPermission = await locationService.hasForegroundPermission();
      if (!hasPermission) {
        const granted = await locationService.requestForegroundPermission();
        if (!granted) {
          setLocError(
            "Permiso de ubicación denegado. Actívalo en Ajustes → Privacidad → Ubicación y vuelve a intentar.",
          );
          return;
        }
      }
      // P0-2: hasta 3 intentos de fix; se acepta el último aunque la calidad
      // no pase el check (la semilla puede quedar vacía y el watch la reemplaza).
      let candidate: FreeRecordingPosition | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const pos = await locationService.getCurrentPosition({
          accuracy: Location.Accuracy.High,
        });
        if (!pos) continue;
        candidate = {
          lat: pos.latitude,
          lng: pos.longitude,
          altitude: pos.altitude,
          accuracy: pos.accuracy ?? null,
          fixTimestamp: pos.timestamp ?? null,
        };
        if (seedQualityCheck(candidate).ok) break;
      }
      if (!candidate) {
        setLocError(
          "No se pudo obtener tu ubicación GPS. Sal al aire libre, espera unos segundos y reintenta.",
        );
        return;
      }
      const ok = await useActivityStore
        .getState()
        .startFreeRecording(
          candidate,
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

      {/* Hoja blanca: locating/tracking/result/detail sobre hoja clara. */}
      <View style={styles.sheet}>
        {step === "locating" && (
          <View style={styles.center}>
            {locating ? (
              <>
                <ActivityIndicator
                  color={AndeanTheme.colors.primaryDark}
                  size="large"
                />
                <Text style={styles.centerTitle}>
                  Obteniendo tu ubicación GPS…
                </Text>
                <Text style={styles.centerText}>
                  Quédate al aire libre unos segundos para un fix preciso.
                </Text>
              </>
            ) : (
              <>
                <Crosshair size={32} color={AndeanTheme.colors.fieldIcon} />
                <Text style={styles.centerTitle}>Graba desde donde estás</Text>
                <Text style={styles.centerText}>
                  Usaremos tu ubicación GPS actual como punto inicial. No
                  necesitas planificar ni elegir destino.
                </Text>
                {locError && (
                  <View style={styles.errorBanner}>
                    <AlertTriangle
                      size={14}
                      color={AndeanTheme.colors.errorText}
                    />
                    <Text style={styles.errorText}>{locError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={requestFixAndStart}
                  style={({ pressed }) => [
                    styles.startBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Obtener ubicación e iniciar grabación"
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
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
  headerTitle: {
    flex: 1,
    color: AndeanTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
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
    gap: 12,
    padding: 24,
  },
  centerTitle: {
    color: AndeanTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  centerText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.errorBg,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.errorBorder,
    borderRadius: 12,
    padding: 10,
  },
  errorText: { color: AndeanTheme.colors.errorText, fontSize: 11, flex: 1 },
  startBtn: {
    backgroundColor: AndeanTheme.colors.cta,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  startBtnText: {
    color: AndeanTheme.colors.white,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  pressed: { opacity: 0.8 },
});
