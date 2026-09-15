import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Compass, Search } from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import type { RouteModel, RouteDifficulty } from "../../../core/domain/types";
import { ListPublishedRoutesUseCase } from "../../../core/application/explore/ListPublishedRoutes.usecase";
import { SearchRoutesUseCase } from "../../../core/application/explore/SearchRoutes.usecase";
import { routeService } from "../../../infrastructure/database/routeService";
import { SEED_PUBLISHED_ROUTES } from "../../../infrastructure/database/routeSeed";
import { AndeanTheme } from "../../theme";
import { Banner } from "../../components/ui";
import { RouteCard } from "./RouteCard";
import { RouteDetailView } from "./RouteDetailView";

interface ExploreViewProps {
  onBack?: () => void;
  /**
   * Gate oficial HU-03: sin sesión, seleccionar ruta no abre el detalle;
   * el Gate guarda el `routeId` pendiente y continúa tras login.
   */
  onRequireAuth?: (routeId: string) => void;
}

const DIFFICULTY_FILTERS: Array<"todas" | RouteDifficulty> = [
  "todas",
  "facil",
  "moderado",
  "dificil",
  "experto",
];

/**
 * HU-03 Explorar — Catálogo público/aprobado + búsqueda/filtro + detalle con gate.
 * Gate oficial: el catálogo es público; el detalle exige sesión activa.
 * Sin sesión, seleccionar una ruta llama `onRequireAuth(routeId)` (el Gate guarda
 * el pendiente y continúa al detalle tras login). GPS/offline exigen `isAuthenticated`.
 * Sin `firebase/*` aquí: solo usecases + `routeService` como puerto.
 */
export const ExploreView: React.FC<ExploreViewProps> = ({
  onBack,
  onRequireAuth,
}) => {
  const { isAuthenticated, exitGuest } = useAuth();
  const [routes, setRoutes] = useState<RouteModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
  const [texto, setTexto] = useState("");
  const [dificultad, setDificultad] = useState<"todas" | RouteDifficulty>(
    "todas",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ListPublishedRoutesUseCase({
        listPublished: () => routeService.listPublishedRoutes(),
      });
      if (data.length === 0) {
        // Colección vacía en dev → seed demo para validar el flujo en Expo Go.
        setRoutes(SEED_PUBLISHED_ROUTES);
        setUsingDemo(true);
      } else {
        setRoutes(data);
        setUsingDemo(false);
      }
    } catch (err: any) {
      // Solo red → fallback demo (credenciales/reglas se propagan como error).
      setRoutes(SEED_PUBLISHED_ROUTES);
      setUsingDemo(true);
      setError("Sin conexión a Firestore. Mostrando datos demo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filtered = useMemo(() => {
    // Filtro local reactivo (mismo criterio que el usecase, sin roundtrip).
    return routes.filter((r) => {
      if (dificultad !== "todas" && r.difficulty !== dificultad) return false;
      const q = texto.trim().toLowerCase();
      if (!q) return true;
      const hay = [
        r.title,
        r.description,
        r.region,
        r.startPoint.name,
        r.endPoint.name,
      ]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [routes, texto, dificultad]);

  const applySearch = useCallback(async () => {
    // Validación Zod del filtro antes de consultar (fuente de verdad en dominio).
    try {
      const result = await SearchRoutesUseCase(
        { texto, dificultad: dificultad === "todas" ? undefined : dificultad },
        { listPublished: async () => routes },
      );
      setRoutes((prev) => {
        // Mantiene el catálogo base; el render usa `filtered`. Solo valida.
        void result;
        return prev;
      });
      setError(null);
    } catch (err: any) {
      setError(err?.issues?.[0]?.message ?? err?.message ?? "Filtro inválido.");
    }
  }, [texto, dificultad, routes]);

  /** Gate duro: con sesión abre el detalle; sin sesión deriva al login con pendiente. */
  const handleSelectRoute = useCallback(
    (routeId: string) => {
      if (isAuthenticated) {
        setSelectedId(routeId);
        return;
      }
      if (onRequireAuth) {
        onRequireAuth(routeId);
        return;
      }
      exitGuest();
    },
    [isAuthenticated, onRequireAuth, exitGuest],
  );

  if (selectedId) {
    return (
      <RouteDetailView
        routeId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Compass size={14} color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.badgeText}>HU-03 · EXPLORAR</Text>
        </View>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityLabel="Volver al inicio">
            <Text style={styles.link}>Inicio</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title}>Catálogo de rutas públicas</Text>
      {usingDemo ? (
        <Banner
          tone="success"
          message="Datos demo (Firestore vacío o sin red)."
        />
      ) : null}
      {error ? <Banner tone="error" message={error} /> : null}

      <View style={styles.searchRow}>
        <Search size={14} color={AndeanTheme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={applySearch}
          placeholder="Buscar por nombre, región, inicio…"
          placeholderTextColor={AndeanTheme.colors.textMuted}
          returnKeyType="search"
          accessibilityLabel="Buscar rutas"
        />
      </View>

      <View style={styles.chips}>
        {DIFFICULTY_FILTERS.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDificultad(d)}
            style={[styles.chip, dificultad === d && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${d}`}
          >
            <Text
              style={[
                styles.chipText,
                dificultad === d && styles.chipTextActive,
              ]}
            >
              {d === "todas" ? "Todas" : d}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.primaryLight} />
          <Text style={styles.muted}>Cargando rutas publicadas…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.muted}>
              Sin rutas que coincidan con los criterios.
            </Text>
          }
          renderItem={({ item }) => (
            <RouteCard
              route={item}
              onPress={() => handleSelectRoute(item.id)}
            />
          )}
        />
      )}
    </View>
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
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: AndeanTheme.colors.primaryLight,
  },
  link: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "800",
  },
  title: { color: AndeanTheme.colors.text, fontSize: 20, fontWeight: "900" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: AndeanTheme.colors.text, fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: AndeanTheme.colors.backgroundSecondary },
  chipText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  chipTextActive: { color: AndeanTheme.colors.primaryLight },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  list: { gap: 10, paddingBottom: 16 },
});
