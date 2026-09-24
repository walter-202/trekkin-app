import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ShieldCheck, Search, ArrowLeft } from "lucide-react-native";
import {
  ListUsersUseCase,
  mergeUniqueUserPages,
  UserPageRequestGuard,
} from "../../../core/application/admin/ListUsers.usecase";
import type { UserPageCursor } from "../../../core/application/admin/ListUsers.usecase";
import type { UserProfile } from "../../../core/domain/types";
import { userProfileService } from "../../../infrastructure/database/userProfileService";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { Banner } from "../../components/ui";
import { UserCard } from "./UserCard";
import { UserDetailView } from "./UserDetailView";

interface UserManagementViewProps {
  onBack?: () => void;
}

type StateFilter = "all" | "active" | "blocked";
type RoleFilter = "all" | "user" | "admin";

const STATE_FILTERS: Array<{ key: StateFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activos" },
  { key: "blocked", label: "Bloqueados" },
];

const ROLE_FILTERS: Array<{ key: RoleFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "user", label: "Usuarios" },
  { key: "admin", label: "Admins" },
];

/**
 * HU-10 C1-C2/T1 + T8 + T13 + T14 — Módulo "Gestión de usuarios" (solo admin).
 * Lista registrada + barra de búsqueda y filtros por estado/rol.
 * Sin `firebase/*` aquí: el case de uso filtra sobre el puerto del servicio.
 */
export const UserManagementView: React.FC<UserManagementViewProps> = ({
  onBack,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const cursorRef = useRef<UserPageCursor | null>(null);
  const requestGuardRef = useRef(new UserPageRequestGuard());
  const retryRef = useRef<{ cursor: UserPageCursor | null; reset: boolean }>({
    cursor: null,
    reset: true,
  });

  const loadPage = useCallback(async (
    cursor: UserPageCursor | null,
    reset: boolean,
    generation: number,
  ) => {
    const requestGuard = requestGuardRef.current;
    if (!requestGuard.begin(generation)) return;
    retryRef.current = { cursor, reset };
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const page = await ListUsersUseCase(
        { texto, state: stateFilter, role: roleFilter },
        { listUsersPage: (args) => userProfileService.listUsersPage(args) },
        cursor,
      );
      if (!requestGuard.isCurrent(generation)) return;
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
      setUsers((current) => {
        return mergeUniqueUserPages(current, page.users, reset);
      });
    } catch (err: unknown) {
      if (requestGuard.isCurrent(generation)) {
        const message = err instanceof Error ? err.message : undefined;
        setError(
          message ??
            "No se pudo consultar el listado de usuarios. Reintenta con red.",
        );
      }
    } finally {
      requestGuard.end(generation);
      if (requestGuard.isCurrent(generation)) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [texto, stateFilter, roleFilter]);

  useEffect(() => {
    const generation = requestGuardRef.current.reset();
    cursorRef.current = null;
    setUsers([]);
    setHasMore(false);
    setError(null);
    setLoadingMore(false);
    void loadPage(null, true, generation);
  }, [loadPage, refreshVersion]);

  const loadNextPage = () => {
    if (!hasMore || loading || loadingMore) return;
    void loadPage(cursorRef.current, false, requestGuardRef.current.current());
  };

  const retryPage = () => {
    void loadPage(
      retryRef.current.cursor,
      retryRef.current.reset,
      requestGuardRef.current.current(),
    );
  };

  // T13: guard defensivo. La entrada real la protege el Gate (tab solo admin).
  if (!currentUser || !isAdmin) {
    return (
      <View style={styles.center}>
        <ShieldCheck size={26} color={AndeanTheme.colors.danger} />
        <Text style={styles.muted}>
          Sin acceso: este módulo es exclusivo del rol Administrador (T13).
        </Text>
      </View>
    );
  }

  if (selectedId) {
    return (
      <UserDetailView
        userId={selectedId}
        onBack={() => {
          setSelectedId(null);
          setRefreshVersion((version) => version + 1);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <ShieldCheck size={12} color={AndeanTheme.colors.amberLight} />
          <Text style={styles.badgeText}>GESTIÓN DE USUARIOS</Text>
        </View>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio"
          >
            <ArrowLeft size={16} color={AndeanTheme.colors.text} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title}>Usuarios registrados</Text>
      <Text style={styles.subtitle}>
        {users.length} usuario{users.length === 1 ? "" : "s"} · la operación se
        confirma antes de ejecutarse
      </Text>

      {error ? (
        <View style={styles.errorRow}>
          <Banner tone="error" message={error} />
          <Pressable onPress={retryPage} accessibilityRole="button" accessibilityLabel="Reintentar carga de usuarios">
            <Text style={styles.actionText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <Search size={14} color={AndeanTheme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={texto}
          onChangeText={setTexto}
          placeholder="Buscar por nombre, alias o correo…"
          placeholderTextColor={AndeanTheme.colors.textMuted}
          returnKeyType="search"
          accessibilityLabel="Buscar usuarios"
        />
      </View>

      <View style={styles.chips}>
        {STATE_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setStateFilter(f.key)}
            style={[styles.chip, stateFilter === f.key && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por estado: ${f.label}`}
            accessibilityState={{ selected: stateFilter === f.key }}
          >
            <Text
              style={[
                styles.chipText,
                stateFilter === f.key && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chips}>
        {ROLE_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setRoleFilter(f.key)}
            style={[styles.chip, roleFilter === f.key && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por rol: ${f.label}`}
            accessibilityState={{ selected: roleFilter === f.key }}
          >
            <Text
              style={[
                styles.chipText,
                roleFilter === f.key && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.muted}>Cargando usuarios registrados…</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>
                Sin usuarios que coincidan con los criterios.
              </Text>
              {hasMore ? (
                loadingMore ? (
                  <View style={styles.loadingMore} accessible accessibilityLabel="Buscando más usuarios">
                    <ActivityIndicator color={AndeanTheme.colors.textSecondary} />
                    <Text style={styles.muted}>Buscando más usuarios…</Text>
                  </View>
                ) : (
                  <Pressable onPress={loadNextPage} accessibilityRole="button" accessibilityLabel="Continuar buscando en más usuarios">
                    <Text style={styles.actionText}>Continuar buscando en más usuarios</Text>
                  </Pressable>
                )
              ) : null}
            </View>
          }
          ListFooterComponent={users.length > 0 ? (
            <View style={styles.footer}>
              {hasMore ? loadingMore ? (
                <View style={styles.loadingMore} accessible accessibilityLabel="Cargando más usuarios">
                  <ActivityIndicator color={AndeanTheme.colors.textSecondary} />
                  <Text style={styles.muted}>Cargando más usuarios…</Text>
                </View>
              ) : (
                <Pressable onPress={loadNextPage} accessibilityRole="button" accessibilityLabel="Cargar más usuarios">
                  <Text style={styles.actionText}>Cargar más usuarios</Text>
                </Pressable>
              ) : (
                <Text style={styles.muted} accessibilityRole="text" accessibilityLabel="Fin de la lista de usuarios">
                  Llegaste al final de la lista.
                </Text>
              )}
            </View>
          ) : null}
          renderItem={({ item }) => (
            <UserCard user={item} onPress={() => setSelectedId(item.uid)} />
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
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AndeanTheme.borderRadius.full,
  },
  badgeText: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: { color: AndeanTheme.colors.text, fontSize: 20, fontWeight: "900" },
  subtitle: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: AndeanTheme.colors.text, fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: AndeanTheme.borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderColor: AndeanTheme.colors.borderLight,
  },
  chipText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  chipTextActive: { color: AndeanTheme.colors.text },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  muted: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
  list: { gap: 10, paddingBottom: 16 },
  empty: { paddingVertical: 32 },
  footer: { alignItems: "center", paddingVertical: 16 },
  loadingMore: { alignItems: "center", gap: 6 },
  errorRow: { gap: 8 },
  actionText: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 8,
  },
});
