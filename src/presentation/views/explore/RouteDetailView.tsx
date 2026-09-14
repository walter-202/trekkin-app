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
  Ruler,
  Clock,
  TrendingUp,
  Flag,
} from "lucide-react-native";
import type { RouteModel } from "../../../core/domain/types";
import { GetRouteDetailUseCase } from "../../../core/application/explore/GetRouteDetail.usecase";
import { routeService } from "../../../infrastructure/database/routeService";
import { SEED_PUBLISHED_ROUTES } from "../../../infrastructure/database/routeSeed";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { Banner } from "../../components/ui";
import { PlanMap } from "../../components/map/PlanMap";

interface RouteDetailViewProps {
  routeId: string;
  onBack: () => void;
}

/**
 * HU-03 C12/C13 — Detalle: descripción, inicio, final, métricas,
 * características y puntos relevantes + mapa. Guest libre: visible sin
 * sesión; las acciones de escritura (GPS/offline) exigen `isAuthenticated`.
 */
export const RouteDetailView: React.FC<RouteDetailViewProps> = ({
  routeId,
  onBack,
}) => {
  const { isAuthenticated, exitGuest } = useAuth();
  const [route, setRoute] = useState<RouteModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <Text style={styles.title}>{route.title}</Text>
      <Text style={styles.region}>{route.region}</Text>
      <Text style={styles.description}>{route.description}</Text>

      {/* HU-03 C13–C15: mapa compartido (PlanMap) con trazado + puntos relevantes. */}
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

      <View style={styles.grid}>
        <View style={styles.metric}>
          <MapPin size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>INICIO</Text>
          <Text style={styles.metricValue}>{route.startPoint.name}</Text>
        </View>
        <View style={styles.metric}>
          <Flag size={14} color={AndeanTheme.colors.amberLight} />
          <Text style={styles.metricLabel}>FINAL</Text>
          <Text style={styles.metricValue}>{route.endPoint.name}</Text>
        </View>
        <View style={styles.metric}>
          <Ruler size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>DISTANCIA</Text>
          <Text style={styles.metricValue}>
            {route.distanceKm.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.metric}>
          <Clock size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>DURACIÓN</Text>
          <Text style={styles.metricValue}>
            {Math.round(route.durationMinutes / 60)} h
          </Text>
        </View>
        <View style={styles.metric}>
          <TrendingUp size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.metricLabel}>DESNIVEL</Text>
          <Text style={styles.metricValue}>{route.elevationGainM ?? 0} m</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            DIFICULTAD · {route.difficulty.toUpperCase()}
          </Text>
          <Text style={styles.metricValue}>
            {route.modality === "solo" ? "Solo" : "Acompañado"}
          </Text>
        </View>
      </View>

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

      {!isAuthenticated ? (
        <View style={styles.guestBox}>
          <Text style={styles.guestText}>
            Exploras como invitado. Inicia sesión para registrar actividad GPS o
            descargar offline.
          </Text>
          <Pressable
            onPress={exitGuest}
            style={styles.guestBtn}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión o crear cuenta"
          >
            <Text style={styles.guestBtnText}>
              Iniciar sesión / Crear cuenta
            </Text>
          </Pressable>
        </View>
      ) : null}
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
  guestBox: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  guestText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  guestBtn: {
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  guestBtnText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "800",
  },
});
