import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { ChevronLeft, Compass, Mountain } from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { Banner, Button } from "../../components/ui";

interface AuthViewProps {
  initialMode?: "register" | "login";
  onBack?: () => void;
  onSuccess?: () => void;
}

/** Compositor auth (HU-01/02): header oscuro + sheet blanca + form + switcher + invitado. */
export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = "register",
  onBack,
  onSuccess,
}) => {
  const { continueAsGuest } = useAuth();

  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);

  const switchFormMode = (next: "register" | "login") => {
    setMode(next);
    setNoticeMessage(null);
    setNoticeError(null);
  };

  const isRegister = mode === "register";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      {/* Zona oscura: top bar + título */}
      <View style={styles.darkZone}>
        <View style={styles.topBar}>
          {isRegister && onBack ? (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <ChevronLeft size={20} color={AndeanTheme.colors.text} />
            </Pressable>
          ) : (
            <View style={styles.iconBtn} accessibilityLabel="Trekkin Bolivia">
              <Mountain size={20} color={AndeanTheme.colors.text} />
            </View>
          )}

          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>TREK-BOLIVIA PRO v1.0</Text>
          </View>

          <View style={styles.iconBtn} accessibilityLabel="Brújula">
            <Compass size={20} color={AndeanTheme.colors.text} />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>
            <Text style={styles.accentGlyph}>
              {isRegister ? "◆" : "●"}
            </Text>{" "}
            {isRegister ? "NUEVA EXPEDICIÓN" : "ACCESO SEGURO"}
          </Text>
          <Text style={styles.title}>
            {isRegister ? "Crear Cuenta" : "Iniciar Sesión"}
          </Text>
          <Text style={styles.subtitle}>
            {isRegister
              ? "Únete a la comunidad de excursionistas y montañeros de Bolivia."
              : "Bienvenido de vuelta, senderista."}
          </Text>
        </View>
      </View>

      {/* Hoja blanca del formulario */}
      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {noticeError ? <Banner tone="error" message={noticeError} /> : null}
          {noticeMessage ? (
            <Banner tone="success" message={noticeMessage} />
          ) : null}

          {isRegister ? (
            <RegisterForm
              onSuccess={() => {
                // HU-01 C5+C6: confirmación + redirección a login (sin auto-sesión).
                setMode("login");
                setNoticeError(null);
                setNoticeMessage(
                  "Cuenta creada. Inicia sesión para continuar.",
                );
              }}
            />
          ) : (
            <LoginForm onSuccess={() => onSuccess?.()} />
          )}

          {/* Nota: Google oculto por ahora (fuera de HU-01/02).
              Sigue en AuthContext.loginWithGoogle para web/futuro. */}

          {isRegister ? (
            <Text style={styles.switchText}>
              ¿Ya tienes cuenta?{" "}
              <Text
                onPress={() => switchFormMode("login")}
                style={styles.switchLink}
                accessibilityRole="link"
                accessibilityLabel="Ir a iniciar sesión"
              >
                Iniciar Sesión
              </Text>
            </Text>
          ) : (
            <View style={styles.loginSwitch}>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>O</Text>
                <View style={styles.divider} />
              </View>
              <Button
                title="Crear una cuenta nueva"
                variant="outline-muted"
                onPress={() => switchFormMode("register")}
                accessibilityLabel="Crear una cuenta nueva"
              />
            </View>
          )}

          {/* HU-03 guest libre: entrada de invitado, sin sesión. */}
          <Text style={styles.guestText}>
            ¿Solo quieres mirar?{" "}
            <Text
              onPress={continueAsGuest}
              style={styles.switchLink}
              accessibilityRole="link"
              accessibilityLabel="Explorar como invitado sin crear cuenta"
            >
              Explorar como invitado
            </Text>
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
  },
  darkZone: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AndeanTheme.colors.primary,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: AndeanTheme.colors.textSecondary,
  },
  titleBlock: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: AndeanTheme.colors.textSecondary,
  },
  accentGlyph: {
    color: AndeanTheme.colors.primary,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: AndeanTheme.colors.white,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: AndeanTheme.colors.textSecondary,
  },
  sheet: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.sheet,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 0,
  },
  loginSwitch: {
    gap: 20,
    marginTop: 24,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: AndeanTheme.colors.fieldBorder,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldHint,
  },
  switchText: {
    fontSize: 13,
    color: AndeanTheme.colors.fieldHint,
    textAlign: "center",
    marginTop: 20,
    paddingBottom: 8,
  },
  switchLink: {
    color: AndeanTheme.colors.primaryDark,
    fontWeight: "800",
  },
  guestText: {
    fontSize: 13,
    color: AndeanTheme.colors.fieldHint,
    textAlign: "center",
    marginTop: 16,
  },
});
