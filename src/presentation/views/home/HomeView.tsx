import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mountain, LogOut, ShieldCheck, User as UserIcon, MapPinned, HardDrive } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { AndeanTheme } from '../../theme';
import { Button } from '../../components/ui';
import { ScreenShell, sheetStyles } from '../../components/layout';

/**
 * HU-02 — Pantalla post-login.
 * Muestra usuario activo + rol (RBAC) y cierre de sesión seguro.
 * De aquí se montan los módulos HU-03…HU-10 (botón "Planificar nueva ruta" abre HU-07;
 * "Descargas" abre HU-04: rutas descargadas offline).
 * Capas duales: identidad en shell oscuro, acciones/datos en hoja blanca.
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
    <ScreenShell
      header={
        <>
          <View style={styles.topBar}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>INICIO</Text>
            </View>
          </View>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Mountain size={22} color={AndeanTheme.colors.white} />
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.greeting}>¡Hola, {currentUser.displayName}!</Text>
              <Text style={styles.handle}>
                @{currentUser.username ?? currentUser.email.split('@')[0]}
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <ShieldCheck
                size={12}
                color={isAdmin ? AndeanTheme.colors.amberLight : AndeanTheme.colors.primaryLight}
              />
              <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>{roleLabel}</Text>
            </View>
          </View>
        </>
      }
    >
      <Text style={sheetStyles.sectionTitle}>Tu cuenta</Text>
      <View style={sheetStyles.card}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <UserIcon size={16} color={AndeanTheme.colors.fieldHint} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoLabel}>Correo electrónico</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{currentUser.email}</Text>
          </View>
        </View>
        {isAdmin ? (
          <View style={sheetStyles.divider} />
        ) : null}
        {isAdmin ? (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <ShieldCheck size={16} color={AndeanTheme.colors.fieldHint} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoLabel}>Permisos</Text>
              <Text style={styles.infoValue}>Acceso total: verás Gestión de Usuarios (HU-10).</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Text style={sheetStyles.sectionTitle}>Módulos de expedición</Text>
      <View style={styles.actions}>
        {onOpenRecord ? (
          <Button
            title="Planificar nueva ruta"
            onPress={onOpenRecord}
            icon={<MapPinned size={16} color={AndeanTheme.colors.white} />}
            accessibilityLabel="Planificar nueva ruta"
          />
        ) : null}
        {onOpenDownloads ? (
          <Button
            title="Descargas (rutas sin conexión)"
            variant="outline-muted"
            onPress={onOpenDownloads}
            icon={<HardDrive size={16} color={AndeanTheme.colors.inkSecondary} />}
            accessibilityLabel="Abrir descargas offline"
          />
        ) : null}
        <Button
          title="Cerrar sesión"
          variant="outline-danger"
          onPress={logout}
          icon={<LogOut size={16} color={AndeanTheme.colors.danger} />}
          accessibilityLabel="Cerrar sesión"
        />
      </View>

      <View style={styles.roadmap}>
        <Text style={styles.roadmapTitle}>ESTADO DE MÓDULOS</Text>
        <Text style={styles.roadmapItem}>HU-03 Explorar rutas → views/explore/ ✓ (activo)</Text>
        <Text style={styles.roadmapItem}>HU-04 Offline → views/downloads/ ✓ (activo)</Text>
        <Text style={styles.roadmapItem}>HU-06 Actividad GPS → views/activity/</Text>
        <Text style={styles.roadmapItem}>HU-07 Planificar nueva ruta → views/record/ ✓ (activo)</Text>
        <Text style={styles.roadmapItem}>HU-10 Usuarios y roles (solo admin, RBAC) ✓ (activo)</Text>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AndeanTheme.colors.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: AndeanTheme.colors.primaryLight,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    color: AndeanTheme.colors.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  handle: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  roleText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  roleTextAdmin: {
    color: AndeanTheme.colors.amberLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: AndeanTheme.colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: AndeanTheme.colors.fieldHint,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: AndeanTheme.colors.ink,
  },
  actions: {
    gap: 12,
  },
  roadmap: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  roadmapTitle: {
    color: AndeanTheme.colors.fieldLabel,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  roadmapItem: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});
