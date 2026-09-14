import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Mountain } from 'lucide-react-native';
import { AuthProvider, useAuth } from './infrastructure/auth/AuthContext';
import { AuthView } from './presentation/views/auth/AuthView';
import { HomeView } from './presentation/views/home/HomeView';
import { ExploreView } from './presentation/views/explore/ExploreView';
import { RecordView } from './presentation/views/record/RecordView';

/**
 * trekkin-app — V1 (HU-01 + HU-02 + HU-07 funcionales, clean-arch).
 * Con sesión → HomeView; desde el hub se abre RecordView (HU-07, planificación).
 * Guest sin sesión (HU-03 scaffold, la define el otro dev) → ExploreView genérica.
 * Sin sesión ni guest → AuthView (registro/login).
 */
type Screen = 'home' | 'record';

function Gate() {
  const { currentUser, isGuest, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');

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

  if (screen !== 'home') {
    return <RecordView onClose={() => setScreen('home')} />;
  }

  return <HomeView onOpenRecord={() => setScreen('record')} />;
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
