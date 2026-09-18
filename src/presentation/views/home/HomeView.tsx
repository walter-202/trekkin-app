import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mountain, LogOut, ShieldCheck, User as UserIcon, MapPinned, HardDrive } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { AndeanTheme } from '../../theme';

/**
 * HU-02 — Pantalla post-login.
 * Muestra usuario activo + rol (RBAC) y cierre de sesión seguro.
 * De aquí se montan los módulos HU-03…HU-10 (botón "Planificar nueva ruta" abre HU-07;
 * "Descargas" abre HU-04: rutas descargadas offline).
 */
interface HomeViewProps {
  /** HU-07 — Abre la planificación de una nueva ruta desde el hub. */
  onOpenRecord?: () => void;
  /** HU-04 — Abre la lista de rutas descargadas (consulta offline). */
  onOpenDownloads?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenRecord, onOpenDownloads }) => {
  const { currentUser, logout, isAdmin } = useAuth();

  if (!currentUser) return null;

  // Sin HU-09 no hay rol moderador en la figura: admin o usuario.
  const roleLabel = currentUser.role === 'admin' ? 'Administrador' : 'Senderista';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Mountain size={20} color={AndeanTheme.colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{currentUser.displayName}</Text>
            <Text style={styles.handle}>
              @{currentUser.username ?? currentUser.email.split('@')[0]}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <ShieldCheck size={12} color={isAdmin ? AndeanTheme.colors.amberLight : AndeanTheme.colors.textSecondary} />
            <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <UserIcon size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.infoText}>{currentUser.email}</Text>
        </View>
        {isAdmin && (
          <Text style={styles.rbacNote}>
            Acceso total: verás Gestión de Usuarios (HU-10).
          </Text>
        )}

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <LogOut size={15} color={AndeanTheme.colors.white} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>

      {onOpenRecord && (
        <Pressable onPress={onOpenRecord} style={styles.actionBtn}>
          <MapPinned size={16} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.actionBtnText}>Planificar nueva ruta</Text>
        </Pressable>
      )}

      {onOpenDownloads && (
        <Pressable onPress={onOpenDownloads} style={styles.actionBtn}>
          <HardDrive size={16} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.actionBtnText}>Descargas (rutas sin conexión)</Text>
        </Pressable>
      )}

      <View style={styles.roadmap}>
        <Text style={styles.roadmapTitle}>MÓDULOS DE EXPEDICIÓN</Text>
        <Text style={styles.roadmapItem}>HU-03 Explorar rutas → src/presentation/views/explore/ ✓ (activo)</Text>
        <Text style={styles.roadmapItem}>HU-04 Offline → src/presentation/views/downloads/ ✓ (activo)</Text>
        <Text style={styles.roadmapItem}>HU-06 Actividad GPS → src/presentation/views/activity/</Text>
        <Text style={styles.roadmapItem}>HU-07 Planificar nueva ruta → src/presentation/views/record/ ✓ (activo)</Text>
        <Text style={styles.roadmapItem}>HU-10 Usuarios y roles (solo admin, RBAC) ✓ (activo)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
    padding: AndeanTheme.spacing.md,
    gap: AndeanTheme.spacing.sm,
  },
  card: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.lg,
    padding: AndeanTheme.spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: AndeanTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  handle: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AndeanTheme.borderRadius.sm,
  },
  roleText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  roleTextAdmin: {
    color: AndeanTheme.colors.amberLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
  },
  rbacNote: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 11,
    marginBottom: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.dangerDark,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingVertical: 12,
  },
  logoutText: {
    color: AndeanTheme.colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  roadmap: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.md,
    padding: 14,
  },
  roadmapTitle: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  roadmapItem: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingVertical: 14,
  },
  actionBtnText: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
});
