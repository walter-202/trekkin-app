import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Mountain } from 'lucide-react-native';
import { AuthProvider, useAuth } from './infrastructure/auth/AuthContext';
import { AuthView } from './presentation/views/auth/AuthView';
import { HomeView } from './presentation/views/home/HomeView';
import { ExploreView } from './presentation/views/explore/ExploreView';

/**
 * trekkin-app — V1 scaffold (HU-01 + HU-02 funcionales).
 * Con sesión → HomeView. Guest sin sesión (HU-03 scaffold, la define el otro dev)
 * → ExploreView genérica. Sin sesión ni guest → AuthView (registro/login).
 */
function Gate() {
  const { currentUser, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <Mountain size={28} color="#34D399" />
        <Text style={styles.loadingText}>Conectando con el campamento base…</Text>
      </View>
    );
  }

  // Sin sesión ni guest solo existe AuthView (dueña de su modo register/login, HU-01/02).
  // HU-01 C6: el redirect post-registro a login lo hace AuthView, no el Gate.
  if (!currentUser) {
    if (isGuest) return <ExploreView />;
    return <AuthView />;
  }

  return <HomeView />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          <Gate />
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#051712' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: '#9CA3AF', fontSize: 12 },
});
