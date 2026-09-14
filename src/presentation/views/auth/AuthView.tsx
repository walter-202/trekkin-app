import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  ChevronLeft,
  Compass,
  Mountain,
  Sparkles,
} from 'lucide-react-native';
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
  const { continueAsGuest } = useAuth();

  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);

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
          <Text style={styles.pillBrand}>TREKKIN APP</Text>
          <View style={styles.pillVersion}>
            <Text style={styles.pillVersionText}>v1.0.0</Text>
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

          {/* Nota: demo rápido y Google ocultos por ahora (fuera de HU-01/02).
              Google sigue en AuthContext.loginWithGoogle para web/futuro. */}

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
