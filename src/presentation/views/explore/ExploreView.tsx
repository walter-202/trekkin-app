import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Compass } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';

/**
 * HU-03 Explorar — VISTA GENÉRICA EN BLANCO (scaffold).
 * El otro dev define criterios y la implementa; este archivo es su punto de partida.
 * Ya cableada al servicio de sesión (HU-01/02): distingue invitado / autenticado / rol.
 * Capacidad prevista para guest: catálogo público; el detalle exige login (HU-03 C4-C5).
 * Prohibido `firebase/*` aquí (ver `views/_template/ModuleTemplateView.tsx` pasos 1-9).
 */
export const ExploreView: React.FC = () => {
  const { currentUser, isGuest, isAuthenticated, exitGuest } = useAuth();

  const sessionLabel = isAuthenticated
    ? `${currentUser?.email} · ${currentUser?.role}`
    : isGuest
      ? 'Invitado (guest, sin sesión)'
      : 'Sin sesión';

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Compass size={14} color="#34D399" />
        <Text style={styles.badgeText}>HU-03 · EXPLORAR (scaffold)</Text>
      </View>
      <Text style={styles.title}>Explorar rutas</Text>
      <Text style={styles.session} accessibilityLabel={`Estado de sesión: ${sessionLabel}`}>
        Sesión: {sessionLabel}
      </Text>
      <Text style={styles.body}>
        Vista genérica en blanco. Catálogo, filtros y detalle los implementa el otro dev con
        sus criterios de aceptación. Catálogo público; detalle con gate de auth y todo lo
        que escriba exige `isAuthenticated` / `hasRole(['admin'])` para lo admin.
        Sin HU-09: no hay moderación.
      </Text>
      {isGuest && !isAuthenticated ? (
        <Pressable
          onPress={exitGuest}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver a iniciar sesión o crear cuenta"
        >
          <Text style={styles.backText}>Volver a Iniciar sesión / Crear cuenta</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#051712', padding: 16, gap: 10, justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#08241c',
    borderWidth: 1,
    borderColor: '#174635',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#6ee7b7', letterSpacing: 1 },
  title: { color: '#F9FAFB', fontSize: 20, fontWeight: '900' },
  session: { color: '#6EE7B7', fontSize: 12, fontWeight: '700' },
  body: { color: '#9CA3AF', fontSize: 12, lineHeight: 17 },
  backBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1A4537',
    backgroundColor: '#0E2E24',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: { color: '#34D399', fontSize: 12, fontWeight: '800' },
});
