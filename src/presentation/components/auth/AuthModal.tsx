import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  Compass,
  User,
  Mail,
  AtSign,
  Lock,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  Mountain,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../../infrastructure/auth/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'register' | 'login';
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'register',
  onClose,
  onSuccess,
}) => {
  const { login, register, loginWithGoogle, switchDemoRole } = useAuth();

  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Por favor introduce tu nombre completo.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Introduce un correo electrónico válido.');
        return;
      }
      if (!username.trim()) {
        setErrorMessage('Elige un nombre de usuario.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Las contraseñas no coinciden.');
        return;
      }
      if (!acceptTerms) {
        setErrorMessage('Debes aceptar los términos y las normas de seguridad en montaña.');
        return;
      }

      setIsLoading(true);
      try {
        // Demo aislado (no se renderiza en el Gate): misma firma que RegisterForm (HU-01 C2-C6).
        await register({
          displayName: name.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
          confirmPassword,
          acceptTerms,
        });
        setSuccessMessage('¡Cuenta creada exitosamente! Ahora inicia sesión.');
        setMode('login');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error al crear la cuenta. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!email.trim()) {
        setErrorMessage('Introduce tu correo electrónico.');
        return;
      }
      if (!password) {
        setErrorMessage('Introduce tu contraseña.');
        return;
      }

      setIsLoading(true);
      try {
        await login(email.trim(), password);
        setSuccessMessage('Sesión iniciada correctamente.');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } catch (err: any) {
        setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      setSuccessMessage('Sesión autenticada con Google.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch {
      setErrorMessage('No se pudo completar la autenticación con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickDemo = (role: 'user' | 'moderator' | 'admin') => {
    switchDemoRole(role);
    setSuccessMessage(`Sesión iniciada como perfil de prueba (${role}).`);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      onClose();
    }, 600);
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.phoneContainer}>
          {/* Header Navigation Bar */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityLabel="Volver"
            >
              <ChevronLeft size={20} color="#ffffff" />
            </Pressable>

            {/* Central Logo Pill (Design Rules) */}
            <View style={styles.centerPill}>
              <View style={styles.mountainBadge}>
                <Mountain size={12} color="#10b981" />
              </View>
              <Text style={styles.pillBrand}>TREK-BOLIVIA</Text>
              <View style={styles.pillVersion}>
                <Text style={styles.pillVersionText}>PRO v2.4</Text>
              </View>
            </View>

            <View style={styles.iconButton}>
              <Compass size={18} color="#10b981" />
            </View>
          </View>

          {/* Title & Andean Subtitle */}
          <View style={styles.heroSection}>
            <View style={styles.subtitleBadge}>
              <Sparkles size={12} color="#34d399" />
              <Text style={styles.subtitleBadgeText}>
                {mode === 'register' ? 'NUEVA EXPEDICIÓN' : 'ACCESO AL CAMPAMENTO BASE'}
              </Text>
            </View>
            <Text style={styles.heroTitle}>
              {mode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </Text>
            <Text style={styles.heroDescription}>
              {mode === 'register'
                ? 'Únete a la comunidad de excursionistas y montañeros de Bolivia.'
                : 'Accede a tus mapas topográficos, bitácoras y cumbres registradas.'}
            </Text>
          </View>

          {/* High-Contrast White Elevated Sheet (DESIGN_RULES Image 1) */}
          <View style={styles.whiteSheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Feedback messages */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#e11d48" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {successMessage && (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              )}

              {/* Form fields in exact order (DESIGN_RULES Section 3.A) */}
              {/* 1. Nombre Completo */}
              {mode === 'register' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.microLabel}>NOMBRE COMPLETO</Text>
                  <View style={styles.inputContainer}>
                    <User size={16} color="#94a3b8" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="Ej. Mateo Condori"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* 2. Correo Electrónico */}
              <View style={styles.fieldGroup}>
                <Text style={styles.microLabel}>CORREO ELECTRÓNICO</Text>
                <View style={styles.inputContainer}>
                  <Mail size={16} color="#94a3b8" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="andino@trekbolivia.bo"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* 3. Usuario */}
              {mode === 'register' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.microLabel}>USUARIO</Text>
                  <View style={styles.inputContainer}>
                    <AtSign size={16} color="#94a3b8" style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="caminante_bolivia"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              {/* 4. Contraseña */}
              <View style={styles.fieldGroup}>
                <Text style={styles.microLabel}>CONTRASEÑA</Text>
                <View style={styles.inputContainer}>
                  <Lock size={16} color="#94a3b8" style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { paddingRight: 40 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.togglePasswordButton}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color="#94a3b8" />
                    ) : (
                      <Eye size={16} color="#94a3b8" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* 5. Verificar Contraseña */}
              {mode === 'register' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.microLabel}>VERIFICAR CONTRASEÑA</Text>
                  <View style={styles.inputContainer}>
                    <Shield size={16} color="#94a3b8" style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.textInput, { paddingRight: 40 }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.togglePasswordButton}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} color="#94a3b8" />
                      ) : (
                        <Eye size={16} color="#94a3b8" />
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 6. Checkbox de términos y normas de seguridad en montaña */}
              {mode === 'register' ? (
                <Pressable
                  onPress={() => setAcceptTerms(!acceptTerms)}
                  style={styles.termsRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      acceptTerms && styles.checkboxChecked,
                    ]}
                  >
                    {acceptTerms && <CheckCircle2 size={14} color="#ffffff" />}
                  </View>
                  <Text style={styles.termsText}>
                    Acepto los{' '}
                    <Text style={styles.termsLink}>términos de servicio</Text> y las{' '}
                    <Text style={styles.termsLink}>
                      normas de seguridad en montaña
                    </Text>
                    .
                  </Text>
                </Pressable>
              ) : (
                /* Demo Switcher for fast verification */
                <View style={styles.demoSection}>
                  <Text style={styles.demoTitle}>PERFILES DE PRUEBA RÁPIDA:</Text>
                  <View style={styles.demoButtonsRow}>
                    <Pressable
                      onPress={() => handleSelectQuickDemo('user')}
                      style={styles.demoButton}
                    >
                      <Text style={styles.demoButtonText}>🧗 Senderista (User)</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSelectQuickDemo('admin')}
                      style={styles.demoButton}
                    >
                      <Text style={styles.demoButtonText}>🛡️ Administrador (Admin)</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 7. Botón CTA CREAR CUENTA → en esmeralda profundo (#064e3b) */}
              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && styles.buttonPressed,
                  isLoading && styles.buttonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.ctaButtonText}>
                      {mode === 'register' ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
                    </Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </>
                )}
              </Pressable>

              {/* 8. Separador O REGÍSTRATE CON */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {mode === 'register' ? 'O REGÍSTRATE CON' : 'O INICIA CON'}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* 9. Botón social Continuar con Google */}
              <Pressable
                onPress={handleGoogleAuth}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <Path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <Path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <Path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </Svg>
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </Pressable>

              {/* Mode switch link */}
              <View style={styles.switchModeContainer}>
                {mode === 'register' ? (
                  <Text style={styles.switchModeText}>
                    ¿Ya tienes una cuenta registrada?{' '}
                    <Text
                      onPress={() => {
                        setMode('login');
                        setErrorMessage(null);
                      }}
                      style={styles.switchModeLink}
                    >
                      Iniciar Sesión
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.switchModeText}>
                    ¿Aún no eres miembro de la plataforma?{' '}
                    <Text
                      onPress={() => {
                        setMode('register');
                        setErrorMessage(null);
                      }}
                      style={styles.switchModeLink}
                    >
                      Crear Cuenta
                    </Text>
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  phoneContainer: {
    flex: 1,
    backgroundColor: '#051712', // Andean Pine
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  centerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#08241c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#174635',
    gap: 6,
  },
  mountainBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  pillVersion: {
    backgroundColor: '#022c22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pillVersionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6ee7b7',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  subtitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 78, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  subtitleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6ee7b7',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  whiteSheet: {
    flex: 1,
    backgroundColor: '#ffffff', // Crisp Pure White
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 11,
    color: '#be123c',
    flex: 1,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  successText: {
    fontSize: 11,
    color: '#047857',
    flex: 1,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  microLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8faf9', // Canvas Soft Tint
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 12,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
  },
  togglePasswordButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#064e3b',
    borderColor: '#064e3b',
  },
  termsText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  termsLink: {
    color: '#064e3b',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  demoSection: {
    marginVertical: 10,
  },
  demoTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  demoButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  ctaButton: {
    backgroundColor: '#064e3b', // Deep Emerald CTA
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#064e3b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    paddingHorizontal: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 44,
    borderRadius: 14,
  },
  googleButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  switchModeContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 12,
    color: '#64748b',
  },
  switchModeLink: {
    color: '#064e3b',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
