import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Mountain } from 'lucide-react-native';
import { AuthProvider, useAuth } from './infrastructure/auth/AuthContext';
import { AuthView } from './presentation/views/auth/AuthView';
import { HomeView } from './presentation/views/home/HomeView';

/**
 * trekkin-app — V1 scaffold (HU-01 + HU-02 funcionales).
 * Sin sesión → AuthView (registro/login). Con sesión → HomeView.
 * Futuros módulos (HU-03…HU-10) se agregan como pestañas/vistas aquí.
 */
function Gate() {
  const { currentUser, loading } = useAuth();
  const [mode, setMode] = useState<'register' | 'login'>('register');

  if (loading) {
    return (
      <View style={styles.center}>
        <Mountain size={28} color="#34D399" />
        <Text style={styles.loadingText}>Conectando con el campamento base…</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={{ flex: 1 }}>
        <AuthView initialMode={mode} onSuccess={() => {}} />
        <View style={styles.modeSwitch}>
          <Pressable onPress={() => setMode(mode === 'register' ? 'login' : 'register')}>
            <Text style={styles.modeSwitchText}>
              {mode === 'register'
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿Aún no eres miembro? Crea tu cuenta'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
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
  modeSwitch: { alignItems: 'center', paddingVertical: 10, backgroundColor: '#051712' },
  modeSwitchText: { color: '#34D399', fontSize: 12, fontWeight: '700' },
});
