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
import { ScreenShell, sheetStyles } from "../../components/layout";
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
 * Capas duales: cabecera en shell oscuro, controles y lista en hoja blanca.
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
      <View style={styles.guard}>
        <ShieldCheck size={26} color={AndeanTheme.colors.danger} />
        <Text style={styles.guardText}>
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
    <ScreenShell
      body="none"
      header={
        <>
          <View style={styles.topBar}>
            <View style={styles.badge}>
              <ShieldCheck size={12} color={AndeanTheme.colors.amberLight} />
              <Text style={styles.badgeText}>GESTIÓN DE USUARIOS</Text>
            </View>
            {onBack ? (
              <Pressable
                onPress={onBack}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Volver al inicio"
              >
                <ArrowLeft size={18} color={AndeanTheme.colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Usuarios registrados</Text>
            <Text style={styles.subtitle}>
              {users.length} usuario{users.length === 1 ? "" : "s"} · la
              operación se confirma antes de ejecutarse
            </Text>
          </View>
        </>
      }
      contentContainerStyle={styles.sheetBody}
    >
      <View style={styles.controls}>
        {error ? (
          <View style={styles.errorRow}>
            <Banner tone="error" message={error} />
            <Pressable
              onPress={retryPage}
              accessibilityRole="button"
              accessibilityLabel="Reintentar carga de usuarios"
            >
              <Text style={styles.actionText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={sheetStyles.searchRow}>
          <Search size={16} color={AndeanTheme.colors.fieldIcon} />
          <TextInput
            style={sheetStyles.searchInput}
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar por nombre, alias o correo…"
            placeholderTextColor={AndeanTheme.colors.fieldHint}
            returnKeyType="search"
            accessibilityLabel="Buscar usuarios"
          />
        </View>

        <View style={sheetStyles.chips}>
          {STATE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setStateFilter(f.key)}
              style={[
                sheetStyles.chip,
                stateFilter === f.key && sheetStyles.chipActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por estado: ${f.label}`}
              accessibilityState={{ selected: stateFilter === f.key }}
            >
              <Text
                style={[
                  sheetStyles.chipText,
                  stateFilter === f.key && sheetStyles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={sheetStyles.chips}>
          {ROLE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setRoleFilter(f.key)}
              style={[
                sheetStyles.chip,
                roleFilter === f.key && sheetStyles.chipActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por rol: ${f.label}`}
              accessibilityState={{ selected: roleFilter === f.key }}
            >
              <Text
                style={[
                  sheetStyles.chipText,
                  roleFilter === f.key && sheetStyles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
          <Text style={sheetStyles.muted}>Cargando usuarios registrados…</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={sheetStyles.muted}>
                Sin usuarios que coincidan con los criterios.
              </Text>
              {hasMore ? (
                loadingMore ? (
                  <View
                    style={styles.loadingMore}
                    accessible
                    accessibilityLabel="Buscando más usuarios"
                  >
                    <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
                    <Text style={sheetStyles.muted}>
                      Buscando más usuarios…
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={loadNextPage}
                    accessibilityRole="button"
                    accessibilityLabel="Continuar buscando en más usuarios"
                  >
                    <Text style={styles.actionText}>
                      Continuar buscando en más usuarios
                    </Text>
                  </Pressable>
                )
              ) : null}
            </View>
          }
          ListFooterComponent={
            users.length > 0 ? (
              <View style={styles.footer}>
                {hasMore ? (
                  loadingMore ? (
                    <View
                      style={styles.loadingMore}
                      accessible
                      accessibilityLabel="Cargando más usuarios"
                    >
                      <ActivityIndicator
                        color={AndeanTheme.colors.primaryDark}
                      />
                      <Text style={sheetStyles.muted}>
                        Cargando más usuarios…
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={loadNextPage}
                      accessibilityRole="button"
                      accessibilityLabel="Cargar más usuarios"
                    >
                      <Text style={styles.actionText}>
                        Cargar más usuarios
                      </Text>
                    </Pressable>
                  )
                ) : (
                  <Text
                    style={sheetStyles.muted}
                    accessibilityRole="text"
                    accessibilityLabel="Fin de la lista de usuarios"
                  >
                    Llegaste al final de la lista.
                  </Text>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <UserCard user={item} onPress={() => setSelectedId(item.uid)} />
          )}
        />
      )}
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  guard: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  guardText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
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
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: AndeanTheme.borderRadius.full,
  },
  badgeText: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  titleBlock: { gap: 6 },
  title: {
    color: AndeanTheme.colors.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  sheetBody: {
    paddingTop: 20,
    gap: 12,
  },
  controls: {
    gap: 12,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 32,
  },
  list: {
    gap: 10,
    paddingBottom: 32,
    flexGrow: 1,
  },
  empty: { paddingVertical: 32, gap: 8 },
  footer: { alignItems: "center", paddingVertical: 16 },
  loadingMore: { alignItems: "center", gap: 6 },
  errorRow: { gap: 8 },
  actionText: {
    color: AndeanTheme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 8,
  },
});
