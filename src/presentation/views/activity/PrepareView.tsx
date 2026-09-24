import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import {
  Navigation,
  MapPin,
  Flag,
  Gauge,
  ListChecks,
  Play,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Download,
} from "lucide-react-native";
import { TrekMap } from "../../components/map/TrekMap";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import {
  locationService,
  type GpsPosition,
} from "../../../infrastructure/location/locationService";
import { tileCacheDB } from "../../../infrastructure/persistence/tileCacheDB";
import { DownloadRouteModal } from "../explore/DownloadRouteModal";
import { distanceM } from "../../../core/domain/calculations";
import { formatDurationMinutes } from "../../utils/format";
import type { PlannedPoint } from "../../../core/domain/plan";
import type { RouteModel } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

/**
 * HU-06 — Vista de preparación de la actividad.
 * Muestra la información de la ruta, el mapa interactivo con brújula/cono de visión,
 * verificación pre-flight offline y advertencia de proximidad al punto de partida.
 */
interface PrepareViewProps {
  onBegin: () => void;
  onClose?: () => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
  experto: "Experto",
};

function toPlannedPoint(p: {
  name: string;
  lat: number;
  lng: number;
}): PlannedPoint {
  return { lat: p.lat, lng: p.lng, name: p.name };
}

export const PrepareView: React.FC<PrepareViewProps> = ({ onBegin }) => {
  const live = useActivityStore((s) => s.live);
  const beginning = useActivityStore((s) => s.finishing);

  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [compassHeading, setCompassHeading] = useState<number | undefined>(undefined);

  // HU-04: Verificación pre-flight offline
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [offlinePackPath, setOfflinePackPath] = useState<string | undefined>(undefined);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [showFarConfirm, setShowFarConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const pos = await locationService.getCurrentPosition();
      if (!active) return;
      if (pos) {
        setPosition(pos);
      } else {
        setLocationError(
          "No se pudo obtener tu ubicación. Activa la ubicación para continuar.",
        );
      }
      setLocating(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Observador de orientación (brújula en tiempo real para el cono de visión)
  useEffect(() => {
    let watch: { remove: () => void } | null = null;
    let active = true;
    void locationService
      .watchHeading((deg) => {
        if (active) setCompassHeading(deg);
      })
      .then((sub) => {
        if (!active) sub?.remove();
        else watch = sub;
      });
    return () => {
      active = false;
      watch?.remove();
    };
  }, []);

  // Comprobar si la ruta ya está descargada en el dispositivo
  useEffect(() => {
    const routeId = live?.route?.routeId;
    if (!routeId) return;
    let active = true;
    tileCacheDB
      .get(routeId)
      .then((record) => {
        if (!active) return;
        if (record?.pmtilesPath) {
          setIsDownloaded(true);
          setOfflinePackPath(record.pmtilesPath);
        } else {
          setIsDownloaded(false);
          setOfflinePackPath(undefined);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [live?.route?.routeId]);

  if (!live) return null;
  const route = live.route;
  const fitTo = [
    ...route.waypoints,
    { lat: route.startPoint.lat, lng: route.startPoint.lng },
    { lat: route.endPoint.lat, lng: route.endPoint.lng },
  ];

  let distanceToStartKm: number | null = null;
  if (position) {
    distanceToStartKm =
      distanceM(
        { lat: position.latitude, lng: position.longitude },
        { lat: route.startPoint.lat, lng: route.startPoint.lng },
      ) / 1000;
  }

  const isFarFromStart = distanceToStartKm != null && distanceToStartKm > 0.5;

  const routeModelForDownload: RouteModel = {
    id: route.routeId,
    title: route.routeTitle,
    description: route.description ?? "",
    region: "",
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    waypoints: route.waypoints,
    checkpoints: route.checkpoints,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    difficulty: route.difficulty,
    modality: "solo",
    status: "published",
    isPrivate: false,
    creatorId: "",
    creatorName: "",
    photos: route.photos ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const handleBeginClick = () => {
    if (isFarFromStart) {
      setShowFarConfirm(true);
    } else {
      onBegin();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Mapa interactivo con ruta oficial, inicio, fin, checkpoints y ubicación actual con cono */}
      <TrekMap
        trail={route.waypoints}
        pointsOfInterest={route.checkpoints}
        start={toPlannedPoint(route.startPoint)}
        end={toPlannedPoint(route.endPoint)}
        currentLocation={
          position
            ? {
                lat: position.latitude,
                lng: position.longitude,
                heading: compassHeading,
              }
            : undefined
        }
        fitTo={fitTo}
        offlinePackPath={offlinePackPath}
        height={240}
      />

      {/* 2. Badge de estado offline o alerta de pre-flight */}
      {isDownloaded ? (
        <View style={styles.offlineReadyCard}>
          <CheckCircle2 size={16} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.offlineReadyText}>
            Paquete offline listo · Mapa vectorial y GPX descargados
          </Text>
        </View>
      ) : (
        <View style={styles.offlineWarningCard}>
          <WifiOff size={16} color={AndeanTheme.colors.amberLight} />
          <View style={{ flex: 1 }}>
            <Text style={styles.offlineWarningTitle}>
              Sin mapa offline descargado
            </Text>
            <Text style={styles.offlineWarningText}>
              Para consultar el mapa si te quedas sin señal en la montaña, te sugerimos descargarlo antes de iniciar.
            </Text>
          </View>
          <Pressable
            onPress={() => setDownloadModalOpen(true)}
            style={styles.downloadActionBtn}
            accessibilityRole="button"
            accessibilityLabel="Descargar mapa offline"
          >
            <Download size={14} color={AndeanTheme.colors.white} />
            <Text style={styles.downloadActionText}>DESCARGAR</Text>
          </Pressable>
        </View>
      )}

      {/* 3. Advertencia de proximidad si el usuario está a >500m del startPoint */}
      {isFarFromStart ? (
        <View style={styles.proximityCard}>
          <AlertTriangle size={18} color={AndeanTheme.colors.amberLight} />
          <View style={{ flex: 1 }}>
            <Text style={styles.proximityTitle}>
              Estás a {distanceToStartKm != null ? distanceToStartKm.toFixed(2) : "0"} km del inicio
            </Text>
            <Text style={styles.proximityText}>
              El punto de partida es &quot;{route.startPoint.name}&quot;. El mapa offline cubre el perímetro de la ruta; tu posición se integrará al sendero una vez que te acerques.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.titleCard}>
        <Text style={styles.title}>{route.routeTitle}</Text>
        <View style={styles.chip}>
          <Gauge size={12} color={AndeanTheme.colors.accentWarning} />
          <Text style={styles.chipText}>
            {DIFFICULTY_LABEL[route.difficulty] ?? route.difficulty}
          </Text>
        </View>
      </View>

      {route.description ? (
        <Text style={styles.description}>{route.description}</Text>
      ) : null}

      {route.photos && route.photos.length > 0 ? (
        <Image
          source={{ uri: route.photos[0] }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.metricsCard}>
        <Text style={styles.metricRowLabel}>MÉTRICAS</Text>
        <View style={styles.metricRow}>
          <MapPin size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Distancia total</Text>
          <Text style={styles.metricValue}>
            {route.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Gauge size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Tiempo estimado</Text>
          <Text style={styles.metricValue}>
            {formatDurationMinutes(route.durationMinutes)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <MapPin size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Punto de inicio</Text>
          <Text style={styles.metricValue}>
            {route.startPoint.name} · {route.startPoint.lat.toFixed(4)},{" "}
            {route.startPoint.lng.toFixed(4)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Flag size={14} color={AndeanTheme.colors.accentWarning} />
          <Text style={styles.metricLabel}>Punto final</Text>
          <Text style={styles.metricValue}>
            {route.endPoint.name} · {route.endPoint.lat.toFixed(4)},{" "}
            {route.endPoint.lng.toFixed(4)}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <ListChecks size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metricLabel}>Checkpoints</Text>
          <Text style={styles.metricValue}>{route.checkpoints.length}</Text>
        </View>
      </View>

      <View style={styles.locationCard}>
        <Navigation size={14} color={AndeanTheme.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>TU UBICACIÓN</Text>
          {locating ? (
            <View style={styles.locationInner}>
              <ActivityIndicator color={AndeanTheme.colors.primary} size="small" />
              <Text style={styles.muted}>Ubicándote…</Text>
            </View>
          ) : locationError ? (
            <Text style={styles.locationError}>{locationError}</Text>
          ) : (
            <Text style={styles.locationValue}>
              {position?.latitude.toFixed(5)}, {position?.longitude.toFixed(5)}
            </Text>
          )}
        </View>
      </View>

      {distanceToStartKm != null && (
        <View style={styles.distanceCard}>
          <Text style={styles.distanceLabel}>
            DISTANCIA APROX. HASTA EL INICIO
          </Text>
          <Text
            style={[
              styles.distanceValue,
              isFarFromStart && { color: AndeanTheme.colors.amberLight },
            ]}
          >
            {distanceToStartKm.toFixed(2)} km
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleBeginClick}
        disabled={beginning}
        style={({ pressed }) => [
          styles.beginBtn,
          pressed && styles.pressed,
          beginning && styles.beginBtnDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Iniciar actividad"
      >
        {beginning ? (
          <ActivityIndicator color="#064E3B" size="small" />
        ) : (
          <>
            <Play size={16} color="#064E3B" />
            <Text style={styles.beginText}>INICIAR ACTIVIDAD</Text>
          </>
        )}
      </Pressable>

      {/* Modal de confirmación si está lejos del inicio */}
      <Modal
        visible={showFarConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFarConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <AlertTriangle size={24} color={AndeanTheme.colors.amberLight} />
            </View>
            <Text style={styles.modalTitle}>¿Iniciar lejos de la ruta?</Text>
            <Text style={styles.modalText}>
              Te encuentras a {distanceToStartKm?.toFixed(2)} km del punto inicial ({route.startPoint.name}).
              {"\n\n"}
              Los mapas offline descargados cubren la zona de la ruta oficial. Si inicias desde aquí, tu ubicación estará fuera del encuadre hasta que te aproximes al sendero.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowFarConfirm(false)}
                style={[styles.modalBtn, styles.modalCancel]}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>CANCELAR Y ACERCARME</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowFarConfirm(false);
                  onBegin();
                }}
                style={[styles.modalBtn, styles.modalConfirm]}
                accessibilityRole="button"
              >
                <Text style={styles.modalConfirmText}>INICIAR DE TODOS MODOS</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de descarga offline HU-04 */}
      {downloadModalOpen ? (
        <DownloadRouteModal
          route={routeModelForDownload}
          visible={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          onCompleted={(record) => {
            setIsDownloaded(true);
            setOfflinePackPath(record.pmtilesPath);
            setDownloadModalOpen(false);
          }}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  offlineReadyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(52, 211, 153, 0.08)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  offlineReadyText: {
    flex: 1,
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "700",
  },
  offlineWarningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: 12,
    padding: 12,
  },
  offlineWarningTitle: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  offlineWarningText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  downloadActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  downloadActionText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  proximityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.accentWarning,
    borderRadius: 12,
    padding: 12,
  },
  proximityTitle: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  proximityText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  titleCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, color: AndeanTheme.colors.text, fontSize: 16, fontWeight: "900" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  description: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  photo: { width: "100%", height: 160, borderRadius: 12 },
  metricsCard: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  metricRowLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: AndeanTheme.colors.textMuted,
  },
  metricRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricLabel: { flex: 1, color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  metricValue: { color: AndeanTheme.colors.text, fontSize: 12, fontWeight: "700" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
  locationInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: AndeanTheme.colors.textMuted,
  },
  locationValue: { color: AndeanTheme.colors.text, fontSize: 12, marginTop: 2 },
  locationError: {
    color: AndeanTheme.colors.danger,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  distanceCard: {
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  distanceLabel: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  distanceValue: { color: AndeanTheme.colors.text, fontSize: 20, fontWeight: "900" },
  beginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  beginBtnDisabled: { opacity: 0.5 },
  beginText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#064E3B",
  },
  pressed: { opacity: 0.8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  modalText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    width: "100%",
    gap: 10,
  },
  modalBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancel: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  modalCancelText: {
    color: AndeanTheme.colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  modalConfirm: {
    backgroundColor: AndeanTheme.colors.accentWarning,
  },
  modalConfirmText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
