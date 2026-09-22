import React, { useEffect, useState } from "react";
// Registers the Expo TaskManager callback at bundle load for headless launches.
import "./infrastructure/location/backgroundLocationTask";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { Mountain, Menu, LogIn, User as UserIcon } from "lucide-react-native";
import { AuthProvider, useAuth } from "./infrastructure/auth/AuthContext";
import { AuthView } from "./presentation/views/auth/AuthView";
import { HomeView } from "./presentation/views/home/HomeView";
import { ProfileView, EditProfileView } from "./presentation/views/profile";
import { ExploreView } from "./presentation/views/explore/ExploreView";
import { RouteDetailView } from "./presentation/views/explore/RouteDetailView";
import { RecordView } from "./presentation/views/record/RecordView";
import { FreeRecordView } from "./presentation/views/record/FreeRecordView";
import { UserManagementView } from "./presentation/views/profile/UserManagementView";
import { DownloadsView } from "./presentation/views/downloads/DownloadsView";
import { ActivityView } from "./presentation/views/activity/ActivityView";
import { Drawer, type DrawerRoute } from "./presentation/components/nav/Drawer";
import { AndeanTheme } from "./presentation/theme";
import { parseShareLink } from "./core/domain/share.schemas";
import type { RouteModel } from "./core/domain/types";
import { useActivityStore } from "./infrastructure/persistence/useActivityStore";

type Screen =
  | "explore"
  | "profile"
  | "edit-profile"
  | "record"
  | "free-record"
  | "users"
  | "downloads"
  | "activity";

function Gate() {
  const { currentUser, loading, isAdmin } = useAuth();
  const [screen, setScreen] = useState<Screen>("explore");
  const [pendingRouteId, setPendingRouteId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authRedirectScreen, setAuthRedirectScreen] =
    useState<Screen | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogKey, setCatalogKey] = useState(0);

  // HU-05 C7 — Resolver enlaces compartidos r/{routeId}
  useEffect(() => {
    const handleUrl = (url: string) => {
      const parsed = parseShareLink(url);
      if (!parsed) return;
      setPendingRouteId(parsed.routeId);
      setScreen("explore");
    };
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

  const handleNavigate = (route: DrawerRoute) => {
    setPendingRouteId(null);
    if (route === "inicio") {
      setScreen("explore");
      setCatalogKey((k) => k + 1);
    } else if (route === "record") {
      if (currentUser) {
        setScreen("record");
      } else {
        setAuthRedirectScreen("record");
        setAuthOpen(true);
      }
    } else if (route === "free-record") {
      if (currentUser) {
        setScreen("free-record");
      } else {
        setAuthRedirectScreen("free-record");
        setAuthOpen(true);
      }
    } else if (route === "actividad") {
      if (currentUser) {
        setScreen("activity");
      } else {
        setAuthRedirectScreen("activity");
        setAuthOpen(true);
      }
    } else if (route === "descargas") {
      setScreen("downloads");
    } else if (route === "perfil") {
      if (currentUser) {
        setScreen("profile");
      } else {
        setAuthRedirectScreen("profile");
        setAuthOpen(true);
      }
    } else if (route === "usuarios") {
      if (isAdmin) {
        setScreen("users");
      }
    } else if (route === "login") {
      setAuthRedirectScreen(null);
      setAuthOpen(true);
    }
  };

  const cancelAuth = () => {
    setAuthOpen(false);
    setAuthRedirectScreen(null);
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    if (authRedirectScreen) {
      setScreen(authRedirectScreen);
      setAuthRedirectScreen(null);
    }
  };

  const handleStartActivity = async (route: RouteModel) => {
    if (!currentUser) {
      setAuthRedirectScreen("activity");
      setAuthOpen(true);
      return;
    }
    await useActivityStore
      .getState()
      .startRoute(currentUser.uid, currentUser.displayName, route.id);
    setPendingRouteId(null);
    setScreen("activity");
  };

  const activeDrawerRoute: DrawerRoute =
    screen === "users"
      ? "usuarios"
      : screen === "record"
        ? "record"
        : screen === "free-record"
          ? "free-record"
          : screen === "activity"
            ? "actividad"
            : screen === "downloads"
              ? "descargas"
              : screen === "profile"
                ? "perfil"
                : "inicio";

  if (loading) {
    return (
      <View style={styles.center}>
        <Mountain size={36} color={AndeanTheme.colors.primary} />
      </View>
    );
  }

  if (authOpen) {
    return (
      <AuthView
        onBack={cancelAuth}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // Vista activa principal
  let mainContent: React.ReactNode;
  if (pendingRouteId) {
    mainContent = (
      <RouteDetailView
        routeId={pendingRouteId}
        onBack={() => setPendingRouteId(null)}
        onRequireAuth={() => {
          setAuthRedirectScreen(null);
          setAuthOpen(true);
        }}
        onStartActivity={handleStartActivity}
      />
    );
  } else if (screen === "record") {
    mainContent = <RecordView onClose={() => setScreen("explore")} />;
  } else if (screen === "free-record") {
    mainContent = <FreeRecordView onClose={() => setScreen("explore")} />;
  } else if (screen === "activity") {
    mainContent = <ActivityView onClose={() => setScreen("explore")} />;
  } else if (screen === "downloads") {
    mainContent = <DownloadsView onBack={() => setScreen("explore")} />;
  } else if (screen === "users" && isAdmin) {
    mainContent = <UserManagementView onBack={() => setScreen("explore")} />;
  } else if (screen === "profile" && currentUser) {
    mainContent = (
      <ProfileView
        onBack={() => setScreen("explore")}
        onOpenEdit={() => setScreen("edit-profile")}
        onOpenRecord={() => setScreen("record")}
        onOpenDownloads={() => setScreen("downloads")}
      />
    );
  } else if (screen === "edit-profile" && currentUser) {
    mainContent = (
      <EditProfileView
        onBack={() => setScreen("profile")}
        onSuccess={() => setScreen("profile")}
      />
    );
  } else {
    mainContent = (
      <ExploreView key={catalogKey} onStartActivity={handleStartActivity} />
    );
  }

  return (
    <View style={styles.gate}>
      {/* Top Header Bar con menú hamburguesa, branding y acceso a perfil */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => setDrawerOpen(true)}
          style={styles.burgerBtn}
          accessibilityRole="button"
          accessibilityLabel="Abrir menú de navegación"
          hitSlop={8}
        >
          <Menu size={20} color={AndeanTheme.colors.text} />
        </Pressable>

        <View style={styles.topBrand}>
          <Mountain size={16} color={AndeanTheme.colors.text} />
          <Text style={styles.topTitle}>TREKKIN BOLIVIA</Text>
        </View>

        {currentUser ? (
          <Pressable
            onPress={() => setScreen("profile")}
            style={styles.userBadgeBtn}
            accessibilityRole="button"
            accessibilityLabel="Ver mi perfil"
          >
            <UserIcon size={14} color={AndeanTheme.colors.textSecondary} />
            <Text style={styles.userBadgeText} numberOfLines={1}>
              {currentUser.displayName.split(" ")[0]}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              setAuthRedirectScreen(null);
              setAuthOpen(true);
            }}
            style={styles.loginBtn}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión o registrarse"
          >
            <LogIn size={13} color={AndeanTheme.colors.textSecondary} />
            <Text style={styles.loginBtnText}>Entrar</Text>
          </Pressable>
        )}
      </View>

      {/* Contenido principal */}
      <View style={styles.contentWrap}>{mainContent}</View>

      {/* Drawer lateral */}
      <Drawer
        open={drawerOpen}
        active={activeDrawerRoute}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onNavigate={handleNavigate}
        onClose={() => setDrawerOpen(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <StatusBar style="light" />
          <Gate />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  gate: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: AndeanTheme.spacing.md,
    paddingVertical: 10,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: AndeanTheme.colors.border,
    zIndex: 10,
  },
  burgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  userBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AndeanTheme.borderRadius.full,
    maxWidth: 110,
  },
  userBadgeText: {
    color: AndeanTheme.colors.text,
    fontSize: 11,
    fontWeight: "800",
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AndeanTheme.borderRadius.full,
  },
  loginBtnText: {
    color: AndeanTheme.colors.text,
    fontSize: 11,
    fontWeight: "800",
  },
  contentWrap: {
    flex: 1,
  },
});
