import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Mountain, Menu } from "lucide-react-native";
import { AuthProvider, useAuth } from "./infrastructure/auth/AuthContext";
import { AuthView } from "./presentation/views/auth/AuthView";
import { HomeView } from "./presentation/views/home/HomeView";
import { ExploreView } from "./presentation/views/explore/ExploreView";
import { RouteDetailView } from "./presentation/views/explore/RouteDetailView";
import { RecordView } from "./presentation/views/record/RecordView";
import { Drawer, type DrawerRoute } from "./presentation/components/nav/Drawer";
import { AndeanTheme } from "./presentation/theme";

/**
 * trekkin-app — HU-01 + HU-02 + HU-03 + HU-07 funcionales.
 * Entrada: siempre el catálogo público (con o sin sesión).
 * Navegación: sidebar recortado (INICIO → catálogo, PERFIL → perfil HU-01/02),
 * visible desde cualquier pantalla, con o sin sesión.
 * Gate oficial HU-03: el detalle exige sesión activa; sin sesión, elegir ruta
 * abre AuthView y tras login continúa al detalle pendiente. PERFIL sin sesión
 * sigue el mismo patrón (pendiente de perfil).
 * HU-01/02 intactas: el Gate no altera register/login/logout ni storage
 * (no toca la lógica interna de AuthContext). HU-07 intacta (RecordView).
 */
type Screen = "explore" | "profile" | "record";

function Gate() {
  const { currentUser, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>("explore");
  const [pendingRouteId, setPendingRouteId] = useState<string | null>(null);
  const [pendingProfile, setPendingProfile] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogKey, setCatalogKey] = useState(0);

  /** Cancela el login: vuelve al catálogo limpio, sin pendientes. */
  const cancelAuth = () => {
    setPendingRouteId(null);
    setPendingProfile(false);
    setAuthOpen(false);
  };

  const goInicio = () => {
    setPendingRouteId(null);
    setScreen("explore");
    setCatalogKey((k) => k + 1);
  };

  const goPerfil = () => {
    if (currentUser) {
      setScreen("profile");
      return;
    }
    setPendingProfile(true);
    setAuthOpen(true);
  };

  const goDrawer = (route: DrawerRoute) => {
    if (route === "inicio") goInicio();
    else goPerfil();
  };

  const activeRoute: DrawerRoute | undefined =
    screen === "profile" && !pendingRouteId ? "perfil" : "inicio";

  let content: React.ReactNode;
  if (loading) {
    content = (
      <View style={styles.center}>
        <Mountain size={28} color="#34D399" />
        <Text style={styles.loadingText}>
          Conectando con el campamento base…
        </Text>
      </View>
    );
  } else if (!currentUser) {
    // Sin sesión la entrada es el catálogo público (nunca AuthView directo).
    // El login solo se dispara al intentar una acción que lo requiera.
    // HU-01 C6: el redirect post-registro a login lo hace AuthView, no el Gate.
    content = authOpen ? (
      <AuthView
        onBack={cancelAuth}
        onSuccess={() => {
          setAuthOpen(false);
          if (pendingProfile) setScreen("profile");
          setPendingProfile(false);
        }}
      />
    ) : (
      <ExploreView
        key={catalogKey}
        onRequireAuth={(routeId) => {
          setPendingRouteId(routeId);
          setAuthOpen(true);
        }}
      />
    );
  } else if (pendingRouteId) {
    // Continuación pendiente: recién logueado con una ruta seleccionada → detalle.
    content = (
      <RouteDetailView
        routeId={pendingRouteId}
        onBack={() => setPendingRouteId(null)}
      />
    );
  } else if (screen === "record") {
    // HU-07 intacta: planificación desde el hub (fuera del drawer recortado).
    content = <RecordView onClose={() => setScreen("profile")} />;
  } else if (screen === "profile") {
    content = <HomeView onOpenRecord={() => setScreen("record")} />;
  } else {
    content = <ExploreView key={catalogKey} />;
  }

  const showChrome = !loading && !authOpen;

  return (
    <View style={styles.gate}>
      {content}
      {showChrome ? (
        <>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={styles.burger}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú de navegación"
            hitSlop={8}
          >
            <Menu size={20} color={AndeanTheme.colors.primaryLight} />
          </Pressable>
          <Drawer
            open={drawerOpen}
            active={activeRoute}
            currentUser={currentUser}
            onNavigate={goDrawer}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      ) : null}
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
  container: { flex: 1, backgroundColor: "#051712" },
  gate: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#9CA3AF", fontSize: 12 },
  burger: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(8, 36, 28, 0.92)",
    borderWidth: 1,
    borderColor: "#1A4537",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
});
