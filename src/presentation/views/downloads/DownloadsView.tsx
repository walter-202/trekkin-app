import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import {
  ChevronLeft,
  Download,
  WifiOff,
  Clock,
  Ruler,
} from "lucide-react-native";
import type { OfflineRoute } from "../../../core/domain/offline";
import { formatBytes } from "../../../core/domain/offline";
import { ListOfflineRoutesUseCase } from "../../../core/application/offline/ListOfflineRoutes.usecase";
import { tileCacheDB } from "../../../infrastructure/persistence/tileCacheDB";
import { AndeanTheme } from "../../theme";
import { Banner } from "../../components/ui";
import { OfflineRouteDetailView } from "./OfflineRouteDetailView";

interface DownloadsViewProps {
  onBack: () => void;
}

const difficultyLabel: Record<OfflineRoute["difficulty"], string> = {
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
  experto: "Experto",
};

/**
 * HU-04 T12 — Rutas descargadas en el dispositivo.
 * Lectura 100% local (sin red): funciona con Internet apagado.
 * Toca una descarga → detalle offline completo.
 */
export const DownloadsView: React.FC<DownloadsViewProps> = ({ onBack }) => {
  const [records, setRecords] = useState<OfflineRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ListOfflineRoutesUseCase({
        list: () => tileCacheDB.list(),
      });
      setRecords(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  if (selectedId) {
    return (
      <OfflineRouteDetailView
        routeId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityLabel="Volver al inicio">
          <ChevronLeft size={16} color={AndeanTheme.colors.text} />
          <Text style={styles.link}>Inicio</Text>
        </Pressable>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>DESCARGAS</Text>
        </View>
      </View>

      <Text style={styles.title}>Rutas descargadas</Text>
      <Text style={styles.session}>
        Se consultan sin Internet desde este dispositivo.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.muted}>Cargando descargas…</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.routeId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <WifiOff size={40} color={AndeanTheme.colors.textMuted} />
              <Banner
                tone="success"
                message="Aún no tienes rutas descargadas. Ve a Explorar → detalle de una ruta → “Descargar ruta”."
              />
            </View>
          }
          renderItem={({ item }) => (
            <DownloadCard
              record={item}
              onPress={() => setSelectedId(item.routeId)}
            />
          )}
        />
      )}
    </View>
  );
};

/** Tarjeta de descarga (colocalizada: un solo uso). */
const DownloadCard: React.FC<{
  record: OfflineRoute;
  onPress: () => void;
}> = ({ record, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${record.title} sin conexión`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.thumb}>
          <Download size={16} color={AndeanTheme.colors.textSecondary} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {record.title}
          </Text>
          <Text style={styles.cardRegion} numberOfLines={1}>
            {record.region}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {difficultyLabel[record.difficulty]}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ruler size={12} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {record.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={12} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {Math.round(record.durationMinutes / 60)} h
          </Text>
        </View>
        <View style={styles.metaItem}>
          <WifiOff size={12} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {formatBytes(record.estimatedSizeMB * 1024 * 1024)}
          </Text>
        </View>
        <Text style={styles.cardRoute} numberOfLines={1}>
          {record.startPoint.name} → {record.endPoint.name}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  link: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: "auto",
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
    letterSpacing: 1,
    color: AndeanTheme.colors.textSecondary,
  },
  title: { color: AndeanTheme.colors.text, fontSize: 20, fontWeight: "900" },
  session: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  list: { gap: 10, paddingBottom: 16 },
  emptyWrap: { gap: 12, paddingVertical: 24, alignItems: "center" },
  card: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.lg,
    padding: AndeanTheme.spacing.md,
    gap: AndeanTheme.spacing.sm,
  },
  pressed: { opacity: 0.85 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1 },
  cardTitle: { color: AndeanTheme.colors.text, fontSize: 14, fontWeight: "800" },
  cardRegion: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
  meta: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  cardRoute: {
    flex: 1,
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    textAlign: "right",
  },
});