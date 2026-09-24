import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Share2, Download, CheckCircle2, Activity } from "lucide-react-native";
import type { RouteModel } from "../../../core/domain/types";
import type { OfflineRoute } from "../../../core/domain/offline";
import { GetRouteDetailWithCacheUseCase } from "../../../core/application/explore/GetRouteDetailWithCache.usecase";
import {
  CheckRouteDownloadAvailabilityUseCase,
  GetRoutePreviewPointsUseCase,
} from "../../../core/application/explore/RouteDetailSupport.usecase";
import { routeService } from "../../../infrastructure/database/routeService";
import { tileCacheDB } from "../../../infrastructure/persistence/tileCacheDB";
import { routeDetailCache } from "../../../infrastructure/persistence/routeDetailCache";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { Banner, Button } from "../../components/ui";
import { ScreenShell, sheetStyles } from "../../components/layout";
import { TrekMap } from "../../components/map/TrekMap";
import { ShareModal } from "./ShareModal";
import { DownloadRouteModal } from "./DownloadRouteModal";

interface RouteDetailViewProps {
  routeId: string;
  onBack: () => void;
  onRequireAuth?: () => void;
  onStartActivity?: (route: RouteModel) => void;
}

const difficultyLabel: Record<RouteModel["difficulty"], string> = {
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
  experto: "Experto",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h}h ${m}m`;
}

/**
 * HU-03 C12/C13 — Detalle: descripción, inicio, final, métricas,
 * características y puntos relevantes + mapa. Guest libre: visible sin
 * sesión; las acciones de escritura (GPS/offline) exigen `isAuthenticated`.
 */
export const RouteDetailView: React.FC<RouteDetailViewProps> = ({
  routeId,
  onBack,
  onRequireAuth,
  onStartActivity,
}) => {
  const { isAuthenticated, exitGuest } = useAuth();
  const [route, setRoute] = useState<RouteModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const routeTrail = useMemo(
    () => route ? GetRoutePreviewPointsUseCase(route) : [],
    [route],
  );
  const downloadAvailability = useMemo(
    () => route
      ? CheckRouteDownloadAvailabilityUseCase(route, isAuthenticated)
      : { available: false as const, reason: "route_not_published" as const },
    [route, isAuthenticated],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      setDownloaded(false);
      setDownloadOpen(false);
      setDownloadMessage(null);
      setCacheMessage(null);
      try {
        await GetRouteDetailWithCacheUseCase(
          routeId,
          {
            getCached: (id) => routeDetailCache.get(id),
            getById: (id) => routeService.getRouteById(id),
            saveCached: (detail) => routeDetailCache.save(detail),
          },
          (detail, source) => {
            if (!alive) return;
            setRoute(detail);
            setLoading(false);
            setError(null);
            setCacheMessage(source === "cache" ? "Mostrando detalles guardados mientras se actualizan." : null);
          },
          () => {
            if (alive) setCacheMessage("Se muestra una copia guardada; no se pudo actualizar. El mapa base puede necesitar conexión.");
          },
        );
      } catch (err: any) {
        if (alive) {
          setError(err?.message ?? "No se pudo cargar la ruta.");
        }
      } finally {
        if (alive) setLoading(false);
      }
      // HU-04: ¿ya está descargada en el dispositivo?
      const isCached = await tileCacheDB.isDownloaded(routeId);
      if (alive) setDownloaded(isCached);
    })();
    return () => {
      alive = false;
    };
  }, [routeId]);

  const requestDownload = () => {
    if (!downloadAvailability.available) {
      if (downloadAvailability.reason === "authentication_required") {
        (onRequireAuth ?? exitGuest)();
        return;
      }
      setDownloadMessage("Esta ruta todavía no tiene un par GPX + PMTiles validado para descargar.");
      return;
    }
    setDownloadMessage(null);
    setDownloadOpen(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AndeanTheme.colors.primaryLight} />
        <Text style={styles.muted}>Cargando detalle de la ruta…</Text>
      </View>
    );
  }

  if (error || !route) {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="Volver al catálogo"
        >
          <ChevronLeft size={16} color={AndeanTheme.colors.text} />
          <Text style={styles.backText}>Catálogo</Text>
        </Pressable>
        <Banner tone="error" message={error ?? "Ruta no disponible."} />
      </View>
    );
  }

  return (
    <ScreenShell
      body="none"
      header={
        <>
          <View style={styles.topBar}>
            <Pressable
              onPress={onBack}
              style={styles.backBtn}
              accessibilityLabel="Volver al catálogo"
            >
              <ChevronLeft size={16} color={AndeanTheme.colors.text} />
              <Text style={styles.backText}>Catálogo</Text>
            </Pressable>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>DETALLE</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            {route.region ? (
              <Text style={styles.region}>{route.region.toUpperCase()}</Text>
            ) : null}
            <Text style={styles.title}>{route.title}</Text>
            <Text style={styles.terminals}>
              {route.startPoint.name} → {route.endPoint.name}
            </Text>
            <View style={styles.diffBadge}>
              <Text style={styles.diffBadgeText}>
                {difficultyLabel[route.difficulty]}
              </Text>
            </View>
          </View>
        </>
      }
    >
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.content}
      >
        {/* 1. Visual block: mapa nativo compartido + badge de desnivel */}
        <View style={styles.visualBlock}>
          <TrekMap
            start={{
              lat: route.startPoint.lat,
              lng: route.startPoint.lng,
              name: route.startPoint.name,
            }}
            end={{
              lat: route.endPoint.lat,
              lng: route.endPoint.lng,
              name: route.endPoint.name,
            }}
            trail={routeTrail}
            pointsOfInterest={route.checkpoints}
            height={260}
            accessibilityLabel={`Mapa de ${route.title}`}
          />
          {route.elevationGainM ? (
            <View style={styles.maxPoint} pointerEvents="none">
              <Text style={styles.maxPointLabel}>DESNIVEL</Text>
              <Text style={styles.maxPointValue}>
                +{route.elevationGainM.toLocaleString("es-BO")}{" "}
                <Text style={styles.maxPointUnit}>m</Text>
              </Text>
            </View>
          ) : null}
        </View>
        {routeTrail.length < 2 ? (
          <Text style={styles.downloadNotice} accessibilityRole="alert">
            Esta ruta todavía no tiene una traza visible. Se muestran solo sus puntos de inicio y fin.
          </Text>
        ) : null}
        {cacheMessage ? (
          <Text style={styles.cacheNotice} accessibilityRole="alert">
            {cacheMessage}
          </Text>
        ) : null}

        {/* 2. Acciones: compartir (HU-05) y descarga del paquete offline (HU-04) */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => setShareOpen(true)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Compartir ruta"
          >
            <Share2 size={18} color={AndeanTheme.colors.primaryDark} />
          </Pressable>
          <Pressable
            onPress={requestDownload}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Descargar ruta para uso offline"
          >
            <Download
              size={18}
              color={
                downloaded
                  ? AndeanTheme.colors.primaryDark
                  : AndeanTheme.colors.inkSecondary
              }
            />
          </Pressable>
        </View>
        {downloadMessage ? (
          <Text style={styles.downloadNotice} accessibilityRole="alert">
            {downloadMessage}
          </Text>
        ) : null}

        {/* 3. Tarjeta horizontal de métricas */}
        <View style={[styles.metricsCard, sheetStyles.card]}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Distancia</Text>
            <Text style={styles.metricValue}>
              {route.distanceKm.toFixed(1)}{" "}
              <Text style={styles.metricUnit}>km</Text>
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Desnivel</Text>
            <Text style={styles.metricValue}>
              {(route.elevationGainM ?? 0).toLocaleString("es-BO")}{" "}
              <Text style={styles.metricUnit}>m</Text>
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Tiempo</Text>
            <Text style={styles.metricValue}>
              {formatDuration(route.durationMinutes)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Modalidad</Text>
            <Text style={styles.metricValueAccent}>
              {route.modality === "solo" ? "Solo" : "Acompañado"}
            </Text>
          </View>
        </View>

        {/* 4. Descripción / detalle del itinerario */}
        <View style={[styles.itineraryCard, sheetStyles.card]}>
          <Text style={styles.itineraryTitle}>
            ●&nbsp;&nbsp;DETALLE DEL ITINERARIO
          </Text>
          <Text style={styles.description}>{route.description}</Text>
        </View>

        {/* 5. Puntos relevantes */}
        <Text style={sheetStyles.sectionTitle}>
          Puntos relevantes ({route.checkpoints.length})
        </Text>
        {route.checkpoints.length === 0 ? (
          <Text style={sheetStyles.muted}>
            Sin puntos registrados para esta ruta.
          </Text>
        ) : (
          route.checkpoints.map((cp) => (
            <View key={cp.id} style={styles.checkpoint}>
              <Text style={styles.checkpointName}>
                {cp.name} · {cp.category}
              </Text>
              {cp.notes ? (
                <Text style={sheetStyles.muted}>{cp.notes}</Text>
              ) : null}
            </View>
          ))
        )}

        {/* 6. Banner de invitado */}
        {!isAuthenticated ? (
          <View style={styles.guestBox}>
            <Text style={styles.guestText}>
              Exploras como invitado. Inicia sesión para registrar actividad GPS o
              descargar offline.
            </Text>
            <Button
              title="Iniciar sesión / Crear cuenta"
              onPress={onRequireAuth ?? exitGuest}
              accessibilityLabel="Iniciar sesión o crear cuenta"
            />
          </View>
        ) : (
          <View style={styles.downloadBox}>
            {downloaded ? (
              <View style={styles.downloadedRow}>
                <CheckCircle2
                  size={14}
                  color={AndeanTheme.colors.primaryDark}
                />
                <Text style={styles.downloadedText}>
                  Ruta descargada · disponible sin conexión
                </Text>
              </View>
            ) : null}
            <Button
              title="Iniciar recorrido (GPS)"
              icon={<Activity size={16} color={AndeanTheme.colors.white} />}
              onPress={() =>
                route && onStartActivity ? onStartActivity(route) : null
              }
              accessibilityLabel="Iniciar recorrido guiado con GPS"
            />
            <Button
              title={
                downloaded ? "Volver a descargar ruta" : "Descargar ruta (offline)"
              }
              icon={<Download size={16} color={AndeanTheme.colors.white} />}
              onPress={requestDownload}
              accessibilityLabel="Descargar ruta para consulta offline"
            />
          </View>
        )}

        {/* 7. Modal de compartir (HU-05) */}
        {shareOpen ? (
          <ShareModal route={route} onClose={() => setShareOpen(false)} />
        ) : null}

        {/* 8. Modal de descarga offline (HU-04) */}
        {downloadOpen && downloadAvailability.available ? (
          <DownloadRouteModal
            route={route}
            visible
            onClose={() => setDownloadOpen(false)}
            onCompleted={(record: OfflineRoute) => {
              setDownloaded(true);
              void record;
            }}
          />
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  sheetScroll: { flex: 1 },
  content: {
    paddingHorizontal: AndeanTheme.spacing.xl,
    paddingTop: AndeanTheme.spacing.xl,
    paddingBottom: AndeanTheme.spacing.xxl,
    gap: AndeanTheme.spacing.lg,
  },
  center: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AndeanTheme.colors.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: AndeanTheme.colors.primaryLight,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  titleBlock: { gap: 6 },
  region: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    color: AndeanTheme.colors.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  terminals: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
  },
  diffBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  diffBadgeText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  visualBlock: { position: "relative" },
  maxPoint: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(15, 20, 18, 0.88)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "flex-end",
  },
  maxPointLabel: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  maxPointValue: {
    color: AndeanTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  maxPointUnit: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: { opacity: 0.55 },
  metricsCard: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  metricCell: { flex: 1, alignItems: "center", gap: 4 },
  metricDivider: {
    width: 1,
    backgroundColor: AndeanTheme.colors.fieldBorder,
    marginVertical: 2,
  },
  metricLabel: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 11,
  },
  metricValue: {
    color: AndeanTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  metricUnit: { color: AndeanTheme.colors.inkSecondary, fontSize: 12 },
  metricValueAccent: {
    color: AndeanTheme.colors.amber,
    fontSize: 14,
    fontWeight: "800",
  },
  itineraryCard: {
    padding: 14,
    gap: 10,
  },
  itineraryTitle: {
    color: AndeanTheme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  description: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  checkpoint: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  checkpointName: {
    color: AndeanTheme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  downloadNotice: {
    color: AndeanTheme.colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  cacheNotice: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  guestBox: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  guestText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  downloadBox: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  downloadedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  downloadedText: {
    color: AndeanTheme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
});
