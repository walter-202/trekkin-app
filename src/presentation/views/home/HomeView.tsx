import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mountain, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';

/**
 * HU-02 — Pantalla post-login (scaffold).
 * Muestra usuario activo + rol (RBAC) y cierre de sesión seguro.
 * Los futuros módulos (HU-03…HU-10) se montan como tarjetas/secciones aquí.
 */
export const HomeView: React.FC = () => {
  const { currentUser, logout, isAdmin } = useAuth();

  if (!currentUser) return null;

  // Sin HU-09 no hay rol moderador en la figura: admin o usuario.
  const roleLabel = currentUser.role === 'admin' ? 'Administrador' : 'Senderista';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Mountain size={22} color="#34D399" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{currentUser.displayName} ✓</Text>
            <Text style={styles.handle}>
              @{currentUser.username ?? currentUser.email.split('@')[0]}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <ShieldCheck size={12} color="#F59E0B" />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <UserIcon size={14} color="#9CA3AF" />
          <Text style={styles.infoText}>{currentUser.email}</Text>
        </View>
        {isAdmin && (
          <Text style={styles.rbacNote}>
            Acceso total: verás Gestión de Usuarios (HU-10).
          </Text>
        )}

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <LogOut size={15} color="#FFFFFF" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>

      <View style={styles.roadmap}>
        <Text style={styles.roadmapTitle}>PRÓXIMOS MÓDULOS (scaffold)</Text>
        <Text style={styles.roadmapItem}>HU-03 Explorar rutas → src/presentation/views/explore/</Text>
        <Text style={styles.roadmapItem}>HU-04 Offline → src/infrastructure/persistence/</Text>
        <Text style={styles.roadmapItem}>HU-06 Actividad GPS → src/presentation/views/activity/</Text>
        <Text style={styles.roadmapItem}>HU-09 Moderación (solo moderador/admin, RBAC)</Text>
        <Text style={styles.roadmapItem}>HU-10 Usuarios y roles (solo admin, RBAC)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#051712', padding: 16, gap: 12 },
  card: {
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 16,
    padding: 16,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: '#F9FAFB', fontSize: 15, fontWeight: '800' },
  handle: { color: '#9CA3AF', fontSize: 11 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  infoText: { color: '#D1D5DB', fontSize: 12 },
  rbacNote: { color: '#6EE7B7', fontSize: 11, marginBottom: 12 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
  },
  logoutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  roadmap: {
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 14,
    padding: 14,
  },
  roadmapTitle: { color: '#6EE7B7', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  roadmapItem: { color: '#9CA3AF', fontSize: 11, marginBottom: 4 },
});
