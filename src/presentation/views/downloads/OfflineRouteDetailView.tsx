import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  ChevronLeft,
  MapPin,
  Flag,
  Ruler,
  Clock,
  TrendingUp,
  WifiOff,
  HardDrive,
  CheckCircle2,
} from "lucide-react-native";
import type { OfflineRoute } from "../../../core/domain/offline";
import { formatBytes } from "../../../core/domain/offline";
import { GetOfflineRouteUseCase } from "../../../core/application/offline/GetOfflineRoute.usecase";
import { tileCacheDB } from "../../../infrastructure/persistence/tileCacheDB";
import { AndeanTheme } from "../../theme";
import { Banner } from "../../components/ui";
import { ScreenShell, sheetStyles } from "../../components/layout";
import { TrekMap } from "../../components/map/TrekMap";
import { OfflineRouteMap } from "../../components/map/OfflineRouteMap";
import { shouldUseOfflineTrailFallback } from "../../../core/domain/offlineMapFallback";

const OFFLINE_MAP_READY_TIMEOUT_MS = 3000;

interface OfflineRouteDetailViewProps {
  routeId: string;
  onBack: () => void;
}

/**
 * HU-04 T12 — Consulta de una ruta descargada SIN Internet.
 * Solo lee el repositorio local (tileCacheDB): nunca toca red.
 */
export const OfflineRouteDetailView: React.FC<OfflineRouteDetailViewProps> = ({
  routeId,
  onBack,
}) => {
  const [record, setRecord] = useState<OfflineRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlinePackReady, setOfflinePackReady] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [mapTimedOut, setMapTimedOut] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const stored = await GetOfflineRouteUseCase(routeId, {
          get: (id) => tileCacheDB.get(id),
        });
        if (alive) setRecord(stored);
      } catch (err: any) {
        if (alive) setError(err?.message ?? "No se pudo abrir la ruta offline.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [routeId]);

  useEffect(() => {
    if (!record?.pmtilesPath) return;
    setOfflinePackReady(false);
    setMapError(null);
    setMapTimedOut(false);
    const timeout = setTimeout(() => setMapTimedOut(true), OFFLINE_MAP_READY_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [record?.pmtilesPath]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AndeanTheme.colors.primaryLight} />
        <Text style={styles.muted}>Abriendo ruta descargada…</Text>
      </View>
    );
  }

  if (error || !record) {
    return (
      <View style={styles.container}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <ChevronLeft size={16} color={AndeanTheme.colors.text} />
          <Text style={styles.backText}>Descargas</Text>
        </Pressable>
        <Banner tone="error" message={error ?? "Ruta offline no disponible."} />
      </View>
    );
  }

  const downloadedLabel = new Date(record.downloadedAt).toLocaleDateString(
    "es-BO",
    { day: "2-digit", month: "short", year: "numeric" },
  );
  const showTrailFallback = shouldUseOfflineTrailFallback({
    hasLocalPack: Boolean(record.pmtilesPath),
    mapReady: offlinePackReady,
    mapError: Boolean(mapError),
    timedOut: mapTimedOut,
  });

  return (
    <ScreenShell
      body="none"
      header={
        <>
          <View style={styles.topBar}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <ChevronLeft size={16} color={AndeanTheme.colors.text} />
              <Text style={styles.backText}>Descargas</Text>
            </Pressable>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>OFFLINE</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{record.title}</Text>
            <Text style={styles.region}>{record.region}</Text>
          </View>
        </>
      }
    >
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.content}
      >
        <Banner
          tone="success"
          message="Disponible sin conexión (usando datos descargados)."
        />

        {showTrailFallback ? (
          <>
            <Banner
              tone="error"
              message="El GPX y el trazado están disponibles sin conexión, pero el renderizador del mapa vectorial no está disponible en esta compilación de Expo."
            />
            <OfflineRouteMap
              route={record}
              height={240}
              accessibilityLabel={`Trazado offline de ${record.title}`}
            />
          </>
        ) : (
          <TrekMap
            trail={record.trail}
            pointsOfInterest={record.checkpoints}
            start={record.startPoint}
            end={record.endPoint}
            offlinePackPath={record.pmtilesPath}
            onMapReady={setOfflinePackReady}
            onMapError={(nextError) => {
              setOfflinePackReady(false);
              setMapError(nextError);
            }}
            height={240}
            accessibilityLabel={`Mapa de ${record.title}`}
          />
        )}

        <View style={styles.grid}>
          <View style={styles.metric}>
            <MapPin size={14} color={AndeanTheme.colors.fieldIcon} />
            <Text style={styles.metricLabel}>INICIO</Text>
            <Text style={styles.metricValue}>{record.startPoint.name}</Text>
          </View>
          <View style={styles.metric}>
            <Flag size={14} color={AndeanTheme.colors.amber} />
            <Text style={styles.metricLabel}>FINAL</Text>
            <Text style={styles.metricValue}>{record.endPoint.name}</Text>
          </View>
          <View style={styles.metric}>
            <Ruler size={14} color={AndeanTheme.colors.fieldIcon} />
            <Text style={styles.metricLabel}>DISTANCIA</Text>
            <Text style={styles.metricValue}>{record.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.metric}>
            <Clock size={14} color={AndeanTheme.colors.fieldIcon} />
            <Text style={styles.metricLabel}>DURACIÓN</Text>
            <Text style={styles.metricValue}>
              {Math.round(record.durationMinutes / 60)} h
            </Text>
          </View>
          <View style={styles.metric}>
            <TrendingUp size={14} color={AndeanTheme.colors.fieldIcon} />
            <Text style={styles.metricLabel}>DESNIVEL</Text>
            <Text style={styles.metricValue}>{record.elevationGainM ?? 0} m</Text>
          </View>
          <View style={styles.metric}>
            <HardDrive size={14} color={AndeanTheme.colors.fieldIcon} />
            <Text style={styles.metricLabel}>
              DIFICULTAD · {record.difficulty.toUpperCase()}
            </Text>
            <Text style={styles.metricValue}>
              {record.modality === "solo" ? "Solo" : "Acompañado"}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{record.description}</Text>

        <Text style={sheetStyles.sectionTitle}>
          Puntos relevantes ({record.checkpoints.length})
        </Text>
        {record.checkpoints.length === 0 ? (
          <Text style={sheetStyles.muted}>
            Sin puntos registrados para esta ruta.
          </Text>
        ) : (
          record.checkpoints.map((cp) => (
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

        <View style={styles.footer}>
          <WifiOff size={12} color={AndeanTheme.colors.fieldIcon} />
          <Text style={styles.footerText}>
            Descargada {downloadedLabel} · {formatBytes(record.estimatedSizeMB * 1024 * 1024)}
          </Text>
          <HardDrive size={12} color={AndeanTheme.colors.fieldIcon} />
          <Text style={styles.footerText}>PMTiles + GPX + manifiesto</Text>
          <CheckCircle2 size={12} color={AndeanTheme.colors.primaryDark} />
        </View>
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
  title: {
    color: AndeanTheme.colors.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  region: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  description: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  metricLabel: {
    color: AndeanTheme.colors.fieldLabel,
    fontSize: 9,
    fontWeight: "800",
  },
  metricValue: {
    color: AndeanTheme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 10,
    flexWrap: "wrap",
  },
  footerText: { color: AndeanTheme.colors.fieldHint, fontSize: 11 },
});
