import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Search } from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import type { RouteModel, RouteDifficulty } from "../../../core/domain/types";
import {
  ListPublishedRoutesPaginatedUseCase,
  mergePublishedRoutePages,
} from "../../../core/application/explore/ListPublishedRoutesPaginated.usecase";
import { SearchRoutesUseCase } from "../../../core/application/explore/SearchRoutes.usecase";
import { routeService } from "../../../infrastructure/database/routeService";
import { AndeanTheme } from "../../theme";
import { Banner, Button } from "../../components/ui";
import { RouteCard } from "./RouteCard";
import { RouteDetailView } from "./RouteDetailView";

interface ExploreViewProps {
  onBack?: () => void;
  onStartActivity?: (route: RouteModel) => void;
  /**
   * HU-05 — Gate de auth para compartir desde el detalle interno: lleva a
   * Login conservando la ruta; al volver, el detalle reabre el ShareModal.
   */
  onRequireAuthForShare?: (routeId: string) => void;
  autoOpenShareRouteId?: string | null;
  onShareAutoOpened?: () => void;
}

const DIFFICULTY_FILTERS: Array<"todas" | RouteDifficulty> = [
  "todas",
  "facil",
  "moderado",
  "dificil",
  "experto",
];
const CATALOG_PAGE_SIZE = 20;

/**
 * HU-03 Explorar — Catálogo público/aprobado + búsqueda/filtro + detalle.
 * Guest libre: catálogo y detalle visibles sin sesión;
 * GPS/offline exigen `isAuthenticated` / `hasRole(['admin'])`.
 * Sin `firebase/*` aquí: solo usecases + `routeService` como puerto.
 * Capas duales (DESIGN_RULES): shell oscuro + hoja blanca con controles y lista.
 */
export const ExploreView: React.FC<ExploreViewProps> = ({
  onBack,
  onStartActivity,
  onRequireAuthForShare,
  autoOpenShareRouteId,
  onShareAutoOpened,
}) => {
  const { currentUser, isAuthenticated, isGuest, exitGuest } = useAuth();
  const [catalogRoutes, setCatalogRoutes] = useState<RouteModel[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteModel[]>([]);
  const [lastVisible, setLastVisible] = useState<unknown | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [dificultad, setDificultad] = useState<"todas" | RouteDifficulty>(
    "todas",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await ListPublishedRoutesPaginatedUseCase(CATALOG_PAGE_SIZE, undefined, {
        listPublishedPage: (pageSize, cursor) =>
          routeService.listPublishedRoutesPaginated(pageSize, cursor),
      });
      setCatalogRoutes(page.routes);
      setLastVisible(page.lastVisible);
      setHasMore(page.hasMore);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las rutas públicas.",
      );
      setCatalogRoutes([]);
      setFilteredRoutes([]);
      setLastVisible(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let isCurrent = true;
    void SearchRoutesUseCase(
      { texto, dificultad: dificultad === "todas" ? undefined : dificultad },
      { listPublished: async () => catalogRoutes },
    )
      .then((result) => {
        if (!isCurrent) return;
        setFilteredRoutes(result);
        setFilterError(null);
      })
      .catch((err: unknown) => {
        if (!isCurrent) return;
        setFilterError(
          err instanceof Error ? err.message : "Filtro inválido.",
        );
      });
    return () => {
      isCurrent = false;
    };
  }, [catalogRoutes, texto, dificultad]);

  const onSearchSubmit = useCallback(() => {
    // Filters already react to input changes; submit keeps the native search affordance explicit.
    setFilterError(null);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || lastVisible === null) return;

    setLoadingMore(true);
    setLoadError(null);
    try {
      const page = await ListPublishedRoutesPaginatedUseCase(
        CATALOG_PAGE_SIZE,
        lastVisible,
        {
          listPublishedPage: (pageSize, cursor) =>
            routeService.listPublishedRoutesPaginated(pageSize, cursor),
        },
      );
      setCatalogRoutes((current) => mergePublishedRoutePages(current, page.routes));
      setLastVisible(page.lastVisible);
      setHasMore(page.hasMore);
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar más rutas públicas.",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, lastVisible, loading, loadingMore]);

  const sessionLabel = isAuthenticated
    ? `${currentUser?.email} · ${currentUser?.role}`
    : isGuest
      ? "Invitado (guest, sin sesión)"
      : "Sin sesión";

  if (selectedId) {
    return (
      <RouteDetailView
        routeId={selectedId}
        onBack={() => setSelectedId(null)}
        onStartActivity={onStartActivity}
        onShareRequireAuth={onRequireAuthForShare}
        autoOpenShare={autoOpenShareRouteId === selectedId}
        onShareAutoOpened={onShareAutoOpened}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {/* Shell oscuro: badge de sección + título */}
      <View style={styles.darkZone}>
        <View style={styles.topBar}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>CATÁLOGO</Text>
          </View>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
            >
              <Text style={styles.link}>Inicio</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Catálogo de rutas públicas</Text>
          <Text style={styles.session}>Sesión: {sessionLabel}</Text>
        </View>
      </View>

      {/* Hoja blanca: buscador, filtros y lista */}
      <View style={styles.sheet}>
        <View style={styles.sheetControls}>
          {loadError ?? filterError ? (
            <Banner tone="error" message={loadError ?? filterError ?? ""} />
          ) : null}

          <View style={styles.searchRow}>
            <Search size={16} color={AndeanTheme.colors.fieldIcon} />
            <TextInput
              style={styles.searchInput}
              value={texto}
              onChangeText={setTexto}
              onSubmitEditing={onSearchSubmit}
              placeholder="Buscar por nombre, región, inicio…"
              placeholderTextColor={AndeanTheme.colors.fieldHint}
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
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
            <Text style={styles.muted}>Cargando rutas publicadas…</Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={filteredRoutes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.muted}>
                Sin rutas que coincidan con los criterios.
              </Text>
            }
            renderItem={({ item }) => (
              <RouteCard route={item} onPress={() => setSelectedId(item.id)} />
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              <View style={styles.footer}>
                {loadingMore ? (
                  <View style={styles.loadMore}>
                    <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
                    <Text style={styles.muted}>Cargando más rutas…</Text>
                  </View>
                ) : null}
                {!isAuthenticated ? (
                  <Button
                    title="Iniciar sesión / Crear cuenta"
                    onPress={exitGuest}
                    accessibilityLabel="Iniciar sesión o crear cuenta"
                  />
                ) : null}
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
  },
  darkZone: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
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
  link: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "800",
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    color: AndeanTheme.colors.white,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  session: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  sheet: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.sheet,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  sheetControls: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: AndeanTheme.colors.ink,
    fontSize: 15,
    padding: 0,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: AndeanTheme.colors.successBg,
    borderColor: AndeanTheme.colors.successBorder,
  },
  chipText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: AndeanTheme.colors.primaryDark,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  muted: {
    color: AndeanTheme.colors.fieldHint,
    fontSize: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
    flexGrow: 1,
  },
  footer: {
    gap: 16,
    paddingTop: 8,
  },
  loadMore: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
});
