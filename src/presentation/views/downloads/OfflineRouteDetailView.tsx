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
import { OfflineRouteMap } from "../../components/map/OfflineRouteMap";

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
          <ChevronLeft size={16} color={AndeanTheme.colors.primaryLight} />
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <ChevronLeft size={16} color={AndeanTheme.colors.primaryLight} />
        <Text style={styles.backText}>Descargas</Text>
      </Pressable>

      <Banner
        tone="success"
        message="Disponible sin conexión (usando datos descargados)."
      />

      <Text style={styles.title}>{record.title}</Text>
      <Text style={styles.region}>{record.region}</Text>

      <OfflineRouteMap route={record} height={240} />

      <View style={styles.grid}>
        <View style={styles.metric}>
          <MapPin size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>INICIO</Text>
          <Text style={styles.metricValue}>{record.startPoint.name}</Text>
        </View>
        <View style={styles.metric}>
          <Flag size={14} color={AndeanTheme.colors.amberLight} />
          <Text style={styles.metricLabel}>FINAL</Text>
          <Text style={styles.metricValue}>{record.endPoint.name}</Text>
        </View>
        <View style={styles.metric}>
          <Ruler size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>DISTANCIA</Text>
          <Text style={styles.metricValue}>{record.distanceKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.metric}>
          <Clock size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>DURACIÓN</Text>
          <Text style={styles.metricValue}>
            {Math.round(record.durationMinutes / 60)} h
          </Text>
        </View>
        <View style={styles.metric}>
          <TrendingUp size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>DESNIVEL</Text>
          <Text style={styles.metricValue}>{record.elevationGainM ?? 0} m</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            DIFICULTAD · {record.difficulty.toUpperCase()}
          </Text>
          <Text style={styles.metricValue}>
            {record.modality === "solo" ? "Solo" : "Acompañado"}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{record.description}</Text>

      <Text style={styles.section}>
        Puntos relevantes ({record.checkpoints.length})
      </Text>
      {record.checkpoints.length === 0 ? (
        <Text style={styles.muted}>Sin puntos registrados para esta ruta.</Text>
      ) : (
        record.checkpoints.map((cp) => (
          <View key={cp.id} style={styles.checkpoint}>
            <Text style={styles.checkpointName}>
              {cp.name} · {cp.category}
            </Text>
            {cp.notes ? <Text style={styles.muted}>{cp.notes}</Text> : null}
          </View>
        ))
      )}

      <View style={styles.footer}>
        <WifiOff size={12} color={AndeanTheme.colors.textMuted} />
        <Text style={styles.footerText}>
          Descargada {downloadedLabel} · {formatBytes(record.estimatedSizeMB * 1024 * 1024)}
        </Text>
        <HardDrive size={12} color={AndeanTheme.colors.textMuted} />
        <Text style={styles.footerText}>Mapa vectorial + trazado + info</Text>
        <CheckCircle2 size={12} color={AndeanTheme.colors.primaryLight} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  content: { padding: AndeanTheme.spacing.lg, gap: 12, paddingBottom: 32 },
  center: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "800",
  },
  title: { color: AndeanTheme.colors.text, fontSize: 20, fontWeight: "900" },
  region: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "700",
  },
  description: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  metricLabel: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
  },
  metricValue: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  section: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  checkpoint: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  checkpointName: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 10,
    flexWrap: "wrap",
  },
  footerText: { color: AndeanTheme.colors.textMuted, fontSize: 11 },
});