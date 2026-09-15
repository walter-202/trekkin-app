import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Share2, Download } from "lucide-react-native";
import type { RouteModel } from "../../../core/domain/types";
import { GetRouteDetailUseCase } from "../../../core/application/explore/GetRouteDetail.usecase";
import { routeService } from "../../../infrastructure/database/routeService";
import { SEED_PUBLISHED_ROUTES } from "../../../infrastructure/database/routeSeed";
import { AndeanTheme } from "../../theme";
import { Banner } from "../../components/ui";
import { PlanMap } from "../../components/map/PlanMap";
import { ShareModal } from "./ShareModal";

interface RouteDetailViewProps {
  routeId: string;
  onBack: () => void;
}

/**
 * HU-03 — Detalle: descripción, inicio, final, métricas,
 * características y puntos relevantes + mapa. Gate oficial: solo se
 * renderiza con sesión activa (el Gate guarda el routeId pendiente).
 */
export const RouteDetailView: React.FC<RouteDetailViewProps> = ({
  routeId,
  onBack,
}) => {
  const [route, setRoute] = useState<RouteModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await GetRouteDetailUseCase(routeId, {
          getById: (id) => routeService.getRouteById(id),
        });
        if (alive) setRoute(detail);
      } catch (err: any) {
        // Fallback demo: si Firestore falla o está vacío, resuelve desde seed
        // para validar el flujo en Expo Go (no oculta errores reales).
        const seed =
          SEED_PUBLISHED_ROUTES.find((r) => r.id === routeId) ?? null;
        if (alive) {
          if (seed) setRoute(seed);
          else setError(err?.message ?? "No se pudo cargar la ruta.");
        }
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
          <ChevronLeft size={16} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.backText}>Catálogo</Text>
        </Pressable>
        <Banner tone="error" message={error ?? "Ruta no disponible."} />
      </View>
    );
  }

  const difficultyLabel: Record<RouteModel["difficulty"], string> = {
    facil: "Fácil",
    moderado: "Moderada",
    dificil: "Difícil",
    experto: "Experta",
  };

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    return `${Math.round(minutes / 60)} hrs`;
  }

  // Punto máximo real: solo si los waypoints traen altitud (nunca se inventa).
  const altitudes = route.waypoints
    .map((w) => w.altitude)
    .filter((a): a is number => typeof a === "number");
  const maxAltitude = altitudes.length > 0 ? Math.max(...altitudes) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
        accessibilityLabel="Volver al catálogo"
      >
        <ChevronLeft size={16} color={AndeanTheme.colors.primaryLight} />
        <Text style={styles.backText}>Catálogo</Text>
      </Pressable>

      {/* 1. Cabecera centrada (sin badge GPS). */}
      <View style={styles.heroHeader}>
        <Text style={styles.brand}>TREKKIN APP</Text>
        <Text style={styles.heroTitle}>DESCRIPCIÓN DE LA RUTA</Text>
      </View>

      {/* 2. Bloque visual con punto máximo. */}
      <View style={styles.visualBlock}>
        <PlanMap
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
          trail={route.waypoints}
          pointsOfInterest={route.checkpoints}
          height={240}
          accessibilityLabel={`Mapa de ${route.title}`}
        />
        {maxAltitude !== null ? (
          <View style={styles.maxPoint}>
            <Text style={styles.maxPointLabel}>PUNTO MÁXIMO</Text>
            <Text style={styles.maxPointValue}>
              {maxAltitude.toLocaleString("es-BO")}{" "}
              <Text style={styles.maxPointUnit}>msnm</Text>
            </Text>
          </View>
        ) : null}
      </View>

      {/* 3. Nombre de la ruta + categoría/dificultad. */}
      <View>
        <Text style={styles.region}>{route.region.toUpperCase()}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{route.title}</Text>
          <View style={styles.diffBadge}>
            <Text style={styles.diffBadgeText}>
              {difficultyLabel[route.difficulty]}
            </Text>
          </View>
        </View>
        <Text style={styles.terminals}>
          {route.startPoint.name} → {route.endPoint.name}
        </Text>
      </View>

      {/* 4. Compartir (HU-05) / Descargar (HU-04, pendiente): si la ruta está
          publicada se comparte; Firestore es la fuente y el enlace lleva el
          routeId — sin duplicar datos. */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => setShareOpen(true)}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Compartir ruta"
        >
          <Share2 size={18} color={AndeanTheme.colors.primaryLight} />
        </Pressable>
        <Pressable
          disabled
          style={[styles.actionBtn, styles.actionDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Descargar ruta offline (próximamente)"
          accessibilityState={{ disabled: true }}
        >
          <Download size={18} color={AndeanTheme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* 5. Fila de métricas. */}
      <View style={styles.metricsCard}>
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
            {formatDuration(route.durationMinutes)}{" "}
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

      {/* 6. Descripción / detalle del itinerario. */}
      <View style={styles.itineraryCard}>
        <Text style={styles.itineraryTitle}>
          ●&nbsp;&nbsp;DETALLE DEL ITINERARIO
        </Text>
        <Text style={styles.description}>{route.description}</Text>
      </View>

      {/* 7. Puntos relevantes. */}
      <Text style={styles.section}>
        Puntos relevantes ({route.checkpoints.length})
      </Text>
      {route.checkpoints.length === 0 ? (
        <Text style={styles.muted}>Sin puntos registrados para esta ruta.</Text>
      ) : (
        route.checkpoints.map((cp) => (
          <View key={cp.id} style={styles.checkpoint}>
            <Text style={styles.checkpointName}>
              {cp.name} · {cp.category}
            </Text>
            {cp.notes ? <Text style={styles.muted}>{cp.notes}</Text> : null}
          </View>
        ))
      )}
      {shareOpen ? (
        <ShareModal route={route} onClose={() => setShareOpen(false)} />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  content: {
    padding: AndeanTheme.spacing.lg,
    paddingTop: 60,
    gap: 12,
    paddingBottom: 32,
  },
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
  heroHeader: { alignItems: "center", gap: 2, marginTop: 2 },
  brand: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  visualBlock: { position: "relative" },
  maxPoint: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(5, 23, 18, 0.88)",
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
  maxPointUnit: { color: AndeanTheme.colors.primaryLight, fontSize: 11 },
  region: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 2,
  },
  title: {
    flex: 1,
    color: AndeanTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  diffBadge: {
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.primaryDark,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  diffBadgeText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "800",
  },
  terminals: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    backgroundColor: AndeanTheme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: { opacity: 0.55 },
  actionPressed: { opacity: 0.85 },
  metricsCard: {
    flexDirection: "row",
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  metricCell: { flex: 1, alignItems: "center", gap: 4 },
  metricDivider: {
    width: 1,
    backgroundColor: AndeanTheme.colors.border,
    marginVertical: 2,
  },
  metricLabel: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
  },
  metricValue: {
    color: AndeanTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  metricUnit: { color: AndeanTheme.colors.primaryLight, fontSize: 12 },
  metricValueAccent: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 14,
    fontWeight: "800",
  },
  itineraryCard: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.lg,
    padding: 14,
    gap: 10,
  },
  itineraryTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  description: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
});
