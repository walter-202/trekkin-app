import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  RotateCcw,
  Camera,
  CheckCircle,
  User as UserIcon,
  Mail,
  Lock,
  Edit2,
  ShieldCheck,
  Moon,
  Sun,
  Contrast,
  Check,
  HeartPulse,
  PhoneCall,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { AndeanTheme } from '../../theme';
import { UpdateProfileSchema } from '../../../core/domain/auth.schemas';

interface EditProfileViewProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  onBack,
  onSuccess,
}) => {
  const { currentUser, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(
    currentUser?.username || currentUser?.email.split('@')[0] || ''
  );
  const [bio, setBio] = useState(
    currentUser?.bio || 'Guía de Montaña • Club Andino Boliviano'
  );
  const [bloodType, setBloodType] = useState(
    currentUser?.bloodType || 'O Rh Positivo (O+)'
  );
  const [emergencyContact, setEmergencyContact] = useState(
    currentUser?.emergencyContact || 'SAR Bolivia / Illimani'
  );
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'high_contrast'>(
    currentUser?.themePreference || 'dark'
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleReset = () => {
    setDisplayName(currentUser.displayName || '');
    setUsername(currentUser.username || currentUser.email.split('@')[0] || '');
    setBio(currentUser.bio || 'Guía de Montaña • Club Andino Boliviano');
    setBloodType(currentUser.bloodType || 'O Rh Positivo (O+)');
    setEmergencyContact(currentUser.emergencyContact || 'SAR Bolivia / Illimani');
    setThemePreference(currentUser.themePreference || 'dark');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validación previa de cliente con Zod
    const validation = UpdateProfileSchema.safeParse({
      displayName,
      username,
      bio,
      bloodType,
      emergencyContact,
      themePreference,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setErrorMsg(firstIssue?.message || 'Revisa los datos introducidos.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(validation.data);
      setSuccessMsg('¡Datos actualizados exitosamente!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBack();
      }, 750);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header superior */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={10}>
          <ChevronLeft size={22} color={AndeanTheme.colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerSub}>TREK-BOLIVIA PRO</Text>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Modificar Datos</Text>
            <CheckCircle size={15} color={AndeanTheme.colors.primaryLight} />
          </View>
        </View>

        <Pressable onPress={handleReset} style={styles.iconBtn} hitSlop={10}>
          <RotateCcw size={18} color={AndeanTheme.colors.primaryLight} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar editable con hint */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <UserIcon size={46} color={AndeanTheme.colors.primaryLight} />
            </View>
            <View style={styles.cameraBadge}>
              <Camera size={14} color="#051712" />
            </View>
          </View>

          <Text style={styles.avatarName}>{displayName || 'Senderista'}</Text>
          <Text style={styles.avatarAlias}>
            @{username.replace(/^@/, '') || 'caminante_andino'}
          </Text>

          <View style={styles.bioChip}>
            <Text style={styles.bioChipText}>★ {bio}</Text>
          </View>

          <Text style={styles.fileHint}>JPG, PNG o WebP, peso máximo 5MB</Text>
        </View>

        {/* Feedback visual */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* Sección: Datos Personales (Modificación Directa) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DATOS PERSONALES</Text>
          <Text style={styles.sectionHint}>Modificación Directa</Text>
        </View>

        <View style={styles.card}>
          {/* Nombre completo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOMBRE COMPLETO</Text>
            <View style={styles.inputContainer}>
              <UserIcon size={16} color={AndeanTheme.colors.primaryLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Nombre completo"
                placeholderTextColor={AndeanTheme.colors.textMuted}
                autoCapitalize="words"
              />
              <Edit2 size={14} color={AndeanTheme.colors.textSecondary} />
            </View>
          </View>

          {/* Alias público */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>NOMBRE DE USUARIO (ALIAS PÚBLICO)</Text>
              <View style={styles.availableBadge}>
                <Text style={styles.availableBadgeText}>Disponible</Text>
              </View>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={styles.input}
                value={username.replace(/^@/, '')}
                onChangeText={(val) => setUsername(val.replace(/^@/, ''))}
                placeholder="caminante_andino"
                placeholderTextColor={AndeanTheme.colors.textMuted}
                autoCapitalize="none"
              />
              <Check size={14} color={AndeanTheme.colors.primaryLight} />
            </View>
          </View>

          {/* Correo electrónico (INMUTABLE / SOLO LECTURA) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
              <View style={styles.verifiedBadge}>
                <CheckCircle size={10} color={AndeanTheme.colors.primaryLight} />
                <Text style={styles.verifiedBadgeText}>Verificado</Text>
              </View>
            </View>
            <View style={[styles.inputContainer, styles.disabledContainer]}>
              <Mail size={16} color={AndeanTheme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={currentUser.email}
                editable={false}
              />
              <Lock size={14} color={AndeanTheme.colors.textMuted} />
            </View>
            <Text style={styles.fieldNote}>
              El correo no se puede cambiar por seguridad de acceso a la cuenta.
            </Text>
          </View>

          {/* Datos opcionales de montaña */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>DESCRIPCIÓN / CLUB DE MONTAÑA</Text>
            <View style={styles.inputContainer}>
              <Sparkles size={16} color={AndeanTheme.colors.amberLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={bio}
                onChangeText={setBio}
                placeholder="Guía de Montaña • Club Andino"
                placeholderTextColor={AndeanTheme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>GRUPO SANGUÍNEO</Text>
              <View style={styles.inputContainer}>
                <HeartPulse size={14} color={AndeanTheme.colors.primaryLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={bloodType}
                  onChangeText={setBloodType}
                  placeholder="O+"
                  placeholderTextColor={AndeanTheme.colors.textMuted}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={styles.label}>CONTACTO RESCATE</Text>
              <View style={styles.inputContainer}>
                <PhoneCall size={14} color={AndeanTheme.colors.amberLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  placeholder="SAR Bolivia"
                  placeholderTextColor={AndeanTheme.colors.textMuted}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Sección: Seguridad y Clave */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SEGURIDAD Y CLAVE</Text>
          <Text style={styles.sectionHint}>Protegido</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.securityItem}>
            <View style={styles.securityIconBox}>
              <Lock size={18} color={AndeanTheme.colors.primaryLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>EDITAR CONTRASEÑA</Text>
              <Text style={styles.securitySub}>Actualizar clave de acceso y sesión</Text>
            </View>
            <View style={styles.actionPill}>
              <Edit2 size={12} color={AndeanTheme.colors.primaryLight} />
              <Text style={styles.actionPillText}>Editar</Text>
            </View>
          </View>
        </View>

        {/* Sección: Tema Visual de Mapa y App */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TEMA VISUAL DE MAPA Y APP</Text>
        </View>

        <View style={styles.themeCardsRow}>
          <Pressable
            onPress={() => setThemePreference('dark')}
            style={[
              styles.themeCard,
              themePreference === 'dark' && styles.themeCardActive,
            ]}
          >
            <View style={styles.themeRadio}>
              <View style={themePreference === 'dark' ? styles.themeRadioInner : undefined} />
            </View>
            <Moon size={20} color={themePreference === 'dark' ? AndeanTheme.colors.primaryLight : AndeanTheme.colors.textSecondary} />
            <Text style={styles.themeCardTitle}>Oscuro Andino</Text>
            <Text style={styles.themeCardSub}>noche / batería</Text>
          </Pressable>

          <Pressable
            onPress={() => setThemePreference('light')}
            style={[
              styles.themeCard,
              themePreference === 'light' && styles.themeCardActive,
            ]}
          >
            <View style={styles.themeRadio}>
              <View style={themePreference === 'light' ? styles.themeRadioInner : undefined} />
            </View>
            <Sun size={20} color={themePreference === 'light' ? AndeanTheme.colors.amberLight : AndeanTheme.colors.textSecondary} />
            <Text style={styles.themeCardTitle}>Claro Altiplano</Text>
            <Text style={styles.themeCardSub}>día soleado</Text>
          </Pressable>

          <Pressable
            onPress={() => setThemePreference('high_contrast')}
            style={[
              styles.themeCard,
              themePreference === 'high_contrast' && styles.themeCardActive,
            ]}
          >
            <View style={styles.themeRadio}>
              <View style={themePreference === 'high_contrast' ? styles.themeRadioInner : undefined} />
            </View>
            <Contrast size={20} color={themePreference === 'high_contrast' ? AndeanTheme.colors.amberLight : AndeanTheme.colors.textSecondary} />
            <Text style={styles.themeCardTitle}>Alto Contraste</Text>
            <Text style={styles.themeCardSub}>nevada / glaciar</Text>
          </Pressable>
        </View>

        {/* Botones de acción */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.btnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#051712" />
          ) : (
            <>
              <Check size={18} color="#051712" />
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={onBack} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Descartar modificaciones y volver</Text>
        </Pressable>
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
    alignItems: 'center',
  },
  headerSub: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
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
  avatarSection: {
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    padding: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
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
  avatarName: {
    color: AndeanTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  avatarAlias: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  bioChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  bioChipText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  fileHint: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.danger,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.primaryLight,
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionHint: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
  },
  card: {
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  availableBadgeText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 9,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 9,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06231B',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  atPrefix: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 14,
    fontWeight: '800',
    marginRight: 4,
  },
  input: {
    flex: 1,
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },
  disabledContainer: {
    backgroundColor: '#041611',
    borderColor: '#123026',
  },
  disabledInput: {
    color: AndeanTheme.colors.textSecondary,
  },
  fieldNote: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#06231B',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  securitySub: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionPillText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '800',
  },
  themeCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeCard: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  themeCardActive: {
    borderColor: AndeanTheme.colors.primaryLight,
    backgroundColor: '#06231B',
  },
  themeRadio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  themeRadioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AndeanTheme.colors.primaryLight,
  },
  themeCardTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  themeCardSub: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 9,
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.primaryLight,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#051712',
    fontSize: 15,
    fontWeight: '900',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
