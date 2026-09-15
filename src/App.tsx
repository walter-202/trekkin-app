import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Mountain } from "lucide-react-native";
import { AuthProvider, useAuth } from "./infrastructure/auth/AuthContext";
import { AuthView } from "./presentation/views/auth/AuthView";
import { HomeView } from "./presentation/views/home/HomeView";
import { ExploreView } from "./presentation/views/explore/ExploreView";
import { RouteDetailView } from "./presentation/views/explore/RouteDetailView";
import { RecordView } from "./presentation/views/record/RecordView";

/**
 * trekkin-app — HU-01 + HU-02 + HU-03 + HU-07 funcionales.
 * Gate oficial HU-03: catálogo público; el detalle exige sesión activa.
 * Sin sesión, seleccionar ruta guarda el routeId pendiente y continúa al
 * detalle automáticamente tras login. HU-01/02 intactas: el Gate no altera
 * register/login/logout ni storage.
 */
type Screen = "home" | "explore" | "record";

function Gate() {
  const { currentUser, isGuest, loading, exitGuest } = useAuth();
  const [screen, setScreen] = useState<Screen>("home");
  const [pendingRouteId, setPendingRouteId] = useState<string | null>(null);
  const isExplore = screen === "explore";

  if (loading) {
    return (
      <View style={styles.center}>
        <Mountain size={28} color="#34D399" />
        <Text style={styles.loadingText}>
          Conectando con el campamento base…
        </Text>
      </View>
    );
  }

  // Sin sesión ni guest solo existe AuthView (dueña de su modo register/login, HU-01/02).
  // HU-01 C6: el redirect post-registro a login lo hace AuthView, no el Gate.
  if (!currentUser) {
    // Gate duro HU-03: el invitado ve el catálogo; al elegir ruta se guarda el
    // pendiente y se va a AuthView. Tras login continúa al detalle (abajo).
    if (isGuest)
      return (
        <ExploreView
          onRequireAuth={(routeId) => {
            setPendingRouteId(routeId);
            exitGuest();
          }}
        />
      );
    return <AuthView />;
  }

  // Continuación pendiente: recién logueado con una ruta seleccionada → detalle.
  if (pendingRouteId) {
    return (
      <RouteDetailView
        routeId={pendingRouteId}
        onBack={() => setPendingRouteId(null)}
      />
    );
  }

  // HU-07: planificación de nueva ruta (borrador) desde el hub.
  if (screen === "record") {
    return <RecordView onClose={() => setScreen("home")} />;
  }

  // HU-03: autenticado alterna Inicio ↔ Explorar sin perder sesión.
  // El detalle abre directo (ya hay sesión); el pendiente solo aplica al login.
  if (isExplore) {
    return <ExploreView onBack={() => setScreen("home")} />;
  }

  return (
    <View style={styles.authedWrap}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setScreen("home")}
          style={[styles.tab, !isExplore && styles.tabActive]}
          accessibilityRole="button"
          accessibilityLabel="Ir al inicio"
        >
          <Text style={[styles.tabText, !isExplore && styles.tabTextActive]}>
            Inicio
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setScreen("explore")}
          style={[styles.tab, isExplore && styles.tabActive]}
          accessibilityRole="button"
          accessibilityLabel="Explorar rutas públicas"
        >
          <Text style={[styles.tabText, isExplore && styles.tabTextActive]}>
            Explorar
          </Text>
        </Pressable>
      </View>
      <HomeView onOpenRecord={() => setScreen("record")} />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#9CA3AF", fontSize: 12 },
  authedWrap: { flex: 1 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1A4537",
    backgroundColor: "#0E2E24",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#06231B" },
  tabText: { color: "#9CA3AF", fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#34D399" },
});
