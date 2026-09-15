import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import {
  ChevronLeft,
  Settings,
  Camera,
  CheckCircle,
  ShieldCheck,
  Key,
  Moon,
  Sun,
  Contrast,
  LogOut,
  Edit2,
  Lock,
  HeartPulse,
  PhoneCall,
  User as UserIcon,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { AndeanTheme } from '../../theme';

interface ProfileViewProps {
  onBack?: () => void;
  onOpenEdit: () => void;
  onOpenRecord?: () => void;
  onOpenDownloads?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onBack,
  onOpenEdit,
}) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const [offlineMapEnabled, setOfflineMapEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'contrast'>('dark');

  if (!currentUser) return null;

  const roleLabel = currentUser.role === 'admin' ? 'ADMINISTRADOR' : 'SENDERISTA PRO';
  const displayBio = currentUser.bio || 'Guía de Montaña • Club Andino Boliviano';
  const displayBlood = currentUser.bloodType || 'O Rh Positivo (O+)';
  const displayEmergency = currentUser.emergencyContact || 'SAR Bolivia / Illimani';
  const summits = currentUser.summitsCount ?? 18;
  const totalKm = currentUser.totalDistanceKm ?? 245;
  const recorded = currentUser.recordedRoutesCount ?? 12;

  return (
    <View style={styles.screen}>
      {/* Header superior */}
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={10}>
            <ChevronLeft size={22} color={AndeanTheme.colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Perfil de Usuario</Text>
          <View style={styles.proBadge}>
            <Sparkles size={10} color="#051712" />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
        <Pressable onPress={onOpenEdit} style={styles.iconBtn} hitSlop={10}>
          <Edit2 size={18} color={AndeanTheme.colors.primaryLight} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera de identidad / Avatar */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <UserIcon size={44} color={AndeanTheme.colors.primaryLight} />
            </View>
            <Pressable onPress={onOpenEdit} style={styles.cameraBadge}>
              <Camera size={13} color="#051712" />
            </Pressable>
          </View>

          <Text style={styles.displayName}>{currentUser.displayName}</Text>
          <Text style={styles.username}>
            @{currentUser.username || currentUser.email.split('@')[0]}
          </Text>

          <View style={styles.bioChip}>
            <Text style={styles.bioText}>★ {displayBio}</Text>
          </View>
          <View style={styles.roleTag}>
            <ShieldCheck size={12} color={AndeanTheme.colors.amberLight} />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>

          {/* Barra de métricas de montaña */}
          <View style={styles.metricsBar}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{summits}</Text>
              <Text style={styles.metricLabel}>CUMBRES</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{totalKm}</Text>
              <Text style={styles.metricLabel}>KM RUTA</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{recorded}</Text>
              <Text style={styles.metricLabel}>GRABADAS</Text>
            </View>
          </View>
        </View>

        {/* Sección: Datos Personales */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DATOS PERSONALES</Text>
          <Pressable onPress={onOpenEdit} style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>Modificar</Text>
            <Edit2 size={12} color={AndeanTheme.colors.primaryLight} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>NOMBRE COMPLETO</Text>
            <View style={styles.valueRow}>
              <Text style={styles.fieldValue}>{currentUser.displayName}</Text>
              <Pressable onPress={onOpenEdit} hitSlop={8}>
                <Edit2 size={14} color={AndeanTheme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldBlock}>
            <View style={styles.labelWithBadge}>
              <Text style={styles.fieldLabel}>CORREO ELECTRÓNICO</Text>
              <View style={styles.verifiedBadge}>
                <CheckCircle size={10} color={AndeanTheme.colors.primaryLight} />
                <Text style={styles.verifiedText}>Verificado</Text>
              </View>
            </View>
            <View style={styles.valueRow}>
              <Text style={[styles.fieldValue, styles.immutableValue]}>
                {currentUser.email}
              </Text>
              <Lock size={12} color={AndeanTheme.colors.textMuted} />
            </View>
            <Text style={styles.immutableHint}>
              El correo está vinculado a tu cuenta de acceso y no es modificable.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Ficha médica y rescate */}
          <View style={styles.twoColRow}>
            <View style={[styles.miniCard, { marginRight: 8 }]}>
              <View style={styles.miniCardHeader}>
                <HeartPulse size={12} color={AndeanTheme.colors.primaryLight} />
                <Text style={styles.miniCardLabel}>GRUPO SANGUÍNEO</Text>
              </View>
              <Text style={styles.miniCardValue}>{displayBlood}</Text>
            </View>

            <View style={styles.miniCard}>
              <View style={styles.miniCardHeader}>
                <PhoneCall size={12} color={AndeanTheme.colors.amberLight} />
                <Text style={styles.miniCardLabel}>CONTACTO RESCATE</Text>
              </View>
              <Text style={styles.miniCardValue} numberOfLines={1}>
                {displayEmergency}
              </Text>
            </View>
          </View>
        </View>

        {/* Sección: Seguridad y Contraseña */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SEGURIDAD Y CONTRASEÑA</Text>
          <View style={styles.statusActive}>
            <Text style={styles.statusActiveText}>● Activo</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.securityRow}>
            <View style={styles.securityLeft}>
              <Key size={18} color={AndeanTheme.colors.primaryLight} />
              <View>
                <Text style={styles.securityTitle}>Contraseña de acceso</Text>
                <Text style={styles.securitySub}>••••••••••••••••</Text>
              </View>
            </View>
            <Pressable
              onPress={onOpenEdit}
              style={styles.pillBtn}
            >
              <Text style={styles.pillBtnText}>Cambiar</Text>
            </Pressable>
          </View>
        </View>

        {/* Sección: Ajustes de Interfaz y Tema */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AJUSTES DE INTERFAZ Y TEMA</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>TEMA VISUAL DE LA APLICACIÓN</Text>
          <View style={styles.themeRow}>
            <Pressable
              onPress={() => setSelectedTheme('dark')}
              style={[
                styles.themeTab,
                selectedTheme === 'dark' && styles.themeTabActive,
              ]}
            >
              <Moon size={14} color={selectedTheme === 'dark' ? '#051712' : AndeanTheme.colors.text} />
              <Text
                style={[
                  styles.themeTabText,
                  selectedTheme === 'dark' && styles.themeTabTextActive,
                ]}
              >
                Oscuro
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedTheme('light')}
              style={[
                styles.themeTab,
                selectedTheme === 'light' && styles.themeTabActive,
              ]}
            >
              <Sun size={14} color={selectedTheme === 'light' ? '#051712' : AndeanTheme.colors.text} />
              <Text
                style={[
                  styles.themeTabText,
                  selectedTheme === 'light' && styles.themeTabTextActive,
                ]}
              >
                Blanco
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedTheme('contrast')}
              style={[
                styles.themeTab,
                selectedTheme === 'contrast' && styles.themeTabActive,
              ]}
            >
              <Contrast size={14} color={selectedTheme === 'contrast' ? '#051712' : AndeanTheme.colors.text} />
              <Text
                style={[
                  styles.themeTabText,
                  selectedTheme === 'contrast' && styles.themeTabTextActive,
                ]}
              >
                Gris
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Mapas Satelitales sin conexión</Text>
              <Text style={styles.switchSub}>Descarga automática en Wi-Fi (Cordillera Real)</Text>
            </View>
            <Switch
              value={offlineMapEnabled}
              onValueChange={setOfflineMapEnabled}
              thumbColor={offlineMapEnabled ? AndeanTheme.colors.primaryLight : '#4B5563'}
              trackColor={{ false: '#1A4537', true: '#064E3B' }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Sistema Métrico</Text>
              <Text style={styles.switchSub}>Metros (msnm), Kilómetros y °C</Text>
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeText}>m / km</Text>
            </View>
          </View>
        </View>

        {/* Botones de acción principales */}
        <Pressable onPress={onOpenEdit} style={styles.primaryActionBtn}>
          <CheckCircle size={18} color="#051712" />
          <Text style={styles.primaryActionText}>Modificar Datos</Text>
        </Pressable>

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <LogOut size={16} color={AndeanTheme.colors.danger} />
          <Text style={styles.logoutText}>Cerrar Sesión de Dispositivo</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerVersion}>
            Trek-Bolivia Pro • Versión 2.4 (Build 890)
          </Text>
          <Text style={styles.footerLinks}>
            Soporte y Rescate • Normas de Montaña • Privacidad
          </Text>
          <Text style={styles.footerCopyright}>
            © 2026 Trek-Bolivia Pro. Sistema de Navegación Alpinística y Cordillera Real.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AndeanTheme.colors.border,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: AndeanTheme.colors.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proBadgeText: {
    color: '#051712',
    fontSize: 10,
    fontWeight: '900',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  avatarCard: {
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    padding: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#06231B',
    borderWidth: 2,
    borderColor: AndeanTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AndeanTheme.colors.primaryLight,
    borderWidth: 2,
    borderColor: AndeanTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    color: AndeanTheme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
  },
  username: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  bioChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  bioText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 16,
  },
  roleText: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 10,
    fontWeight: '800',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#06231B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    paddingVertical: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricNumber: {
    color: AndeanTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: AndeanTheme.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionActionText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  statusActive: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusActiveText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#06231B',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldValue: {
    color: AndeanTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  immutableValue: {
    color: AndeanTheme.colors.textSecondary,
  },
  immutableHint: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AndeanTheme.colors.border,
    marginVertical: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#06231B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    padding: 10,
    gap: 4,
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniCardLabel: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
  },
  miniCardValue: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  securitySub: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  pillBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pillBtnText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  themeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#06231B',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  themeTabActive: {
    backgroundColor: AndeanTheme.colors.primaryLight,
    borderColor: AndeanTheme.colors.primaryLight,
  },
  themeTabText: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  themeTabTextActive: {
    color: '#051712',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  metricBadge: {
    backgroundColor: '#06231B',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metricBadgeText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  primaryActionText: {
    color: '#051712',
    fontSize: 15,
    fontWeight: '900',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutText: {
    color: AndeanTheme.colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
  },
  footerVersion: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  footerLinks: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
  },
  footerCopyright: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
});
