import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Mountain } from "lucide-react-native";
import { AuthProvider, useAuth } from "./infrastructure/auth/AuthContext";
import { AuthView } from "./presentation/views/auth/AuthView";
import { HomeView } from "./presentation/views/home/HomeView";
import { ExploreView } from "./presentation/views/explore/ExploreView";

/**
 * trekkin-app — V1 scaffold (HU-01 + HU-02 funcionales) + HU-03 Explorar.
 * Con sesión → HomeView / ExploreView (tabs, guest libre: el detalle no exige login).
 * Guest sin sesión (HU-03) → ExploreView catálogo+detalle. Sin sesión ni guest → AuthView.
 * HU-01/02 intactas: el Gate no altera register/login/logout ni storage.
 */
function Gate() {
  const { currentUser, isGuest, loading } = useAuth();
  const [section, setSection] = useState<"home" | "explore">("home");
  const isExplore = section === "explore";

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
    if (isGuest) return <ExploreView />;
    return <AuthView />;
  }

  // HU-03 guest libre: autenticado puede alternar Inicio ↔ Explorar sin perder sesión.
  if (isExplore) {
    return <ExploreView onBack={() => setSection("home")} />;
  }

  return (
    <View style={styles.authedWrap}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setSection("home")}
          style={[styles.tab, !isExplore && styles.tabActive]}
          accessibilityRole="button"
          accessibilityLabel="Ir al inicio"
        >
          <Text style={[styles.tabText, !isExplore && styles.tabTextActive]}>
            Inicio
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSection("explore")}
          style={[styles.tab, isExplore && styles.tabActive]}
          accessibilityRole="button"
          accessibilityLabel="Explorar rutas públicas"
        >
          <Text style={[styles.tabText, isExplore && styles.tabTextActive]}>
            Explorar
          </Text>
        </Pressable>
      </View>
      <HomeView />
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
