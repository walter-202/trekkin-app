import React, { useState } from 'react';
import {
  View,
  Text,
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
  Mountain,
  Sparkles,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Banner } from '../../components/ui';

interface AuthViewProps {
  initialMode?: 'register' | 'login';
  onBack?: () => void;
  onSuccess?: () => void;
}

/** Compositor auth (HU-01/02): header + hero + form + Google + demo. Estado de negocio vive en cada form. */
export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'register',
  onBack,
  onSuccess,
}) => {
  const { loginWithGoogle, switchDemoRole, continueAsGuest } = useAuth();

  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setNoticeMessage(null);
    setNoticeError(null);
    try {
      await loginWithGoogle();
      setNoticeMessage('Sesión autenticada con Google.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 900);
    } catch {
      setNoticeError('No se pudo completar la autenticación con Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSelectQuickDemo = (role: 'user' | 'admin') => {
    switchDemoRole(role);
    setNoticeError(null);
    setNoticeMessage(`Sesión iniciada como perfil de prueba (${role === 'admin' ? 'Administrador' : 'Senderista'}).`);
    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 500);
  };

  const switchFormMode = (next: 'register' | 'login') => {
    setMode(next);
    setNoticeMessage(null);
    setNoticeError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screenContainer}
    >
      {/* Header Navigation Bar */}
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}
            accessibilityLabel="Volver"
          >
            <ChevronLeft size={20} color="#ffffff" />
          </Pressable>
        ) : (
          <View style={styles.placeholderButton} />
        )}

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

      {/* High-Contrast White Elevated Sheet */}
      <View style={styles.whiteSheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {noticeError ? <Banner tone="error" message={noticeError} /> : null}
          {noticeMessage ? <Banner tone="success" message={noticeMessage} /> : null}

          {mode === 'register' ? (
            <RegisterForm
              onSuccess={() => {
                // HU-01 C5+C6: mensaje de confirmación + redirección a login (sin auto-sesión).
                setMode('login');
                setNoticeError(null);
                setNoticeMessage('¡Cuenta creada exitosamente! Ahora inicia sesión.');
              }}
            />
          ) : (
            <LoginForm onSuccess={() => onSuccess?.()} />
          )}

          {mode === 'login' ? (
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>PERFILES DE PRUEBA RÁPIDA:</Text>
              <View style={styles.demoButtonsRow}>
                <Pressable
                  onPress={() => handleSelectQuickDemo('user')}
                  style={styles.demoButton}
                  accessibilityRole="button"
                  accessibilityLabel="Probar como senderista"
                >
                  <Text style={styles.demoButtonText}>🧗 Senderista (User)</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSelectQuickDemo('admin')}
                  style={styles.demoButton}
                  accessibilityRole="button"
                  accessibilityLabel="Probar como administrador"
                >
                  <Text style={styles.demoButtonText}>🛡️ Administrador (Admin)</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Separador */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {mode === 'register' ? 'O REGÍSTRATE CON' : 'O INICIA CON'}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botón social Google */}
          <Pressable
            onPress={handleGoogleAuth}
            disabled={isGoogleLoading}
            style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Google"
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#334155" size="small" />
            ) : (
              <>
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
              </>
            )}
          </Pressable>

          {/* Mode Switcher */}
          <View style={styles.switchModeContainer}>
            {mode === 'register' ? (
              <Text style={styles.switchModeText}>
                ¿Ya tienes una cuenta registrada?{' '}
                <Text
                  onPress={() => switchFormMode('login')}
                  style={styles.switchModeLink}
                >
                  Iniciar Sesión
                </Text>
              </Text>
            ) : (
              <Text style={styles.switchModeText}>
                ¿Aún no eres miembro de la plataforma?{' '}
                <Text
                  onPress={() => switchFormMode('register')}
                  style={styles.switchModeLink}
                >
                  Crear Cuenta
                </Text>
              </Text>
            )}
            {/* HU-03 scaffold (criterios los define el otro dev): entrada de invitado, sin sesión. */}
            <Text style={styles.guestText}>
              ¿Solo quieres mirar?{' '}
              <Text
                onPress={continueAsGuest}
                style={styles.switchModeLink}
                accessibilityRole="link"
                accessibilityLabel="Explorar como invitado sin crear cuenta"
              >
                Explorar como invitado
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#051712',
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
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
  placeholderButton: {
    width: 38,
    height: 38,
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
    paddingTop: 4,
    paddingBottom: 16,
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
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 290,
  },
  whiteSheet: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
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
  guestText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  switchModeLink: {
    color: '#064e3b',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
