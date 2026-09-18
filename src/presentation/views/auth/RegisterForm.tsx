import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  User,
  Mail,
  AtSign,
  Lock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { RegisterSchema } from "../../../core/domain/auth.schemas";
import { Field, Button, Banner } from "../../components/ui";

interface RegisterFormProps {
  onSuccess: () => void;
}

type FieldKey =
  | "displayName"
  | "email"
  | "username"
  | "password"
  | "confirmPassword"
  | "acceptTerms";

/** HU-01 — Dueño de su estado + validación Zod (6 campos C2) + submit. */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const validation = RegisterSchema.safeParse({
      displayName: name.trim(),
      email: email.trim(),
      username: username.trim(),
      password,
      confirmPassword,
      acceptTerms,
    });
    if (!validation.success) {
      const mapped: Partial<Record<FieldKey, string>> = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as FieldKey;
        if (key && !mapped[key]) mapped[key] = issue.message;
      }
      setFieldErrors(mapped);
      return;
    }
    setFieldErrors({});
    setIsLoading(true);
    try {
      // HU-01 C2-C4: pasa los 6 campos al contexto, que delega a RegisterUserUseCase (Zod).
      // HU-01 C6: sin auto-sesión — onSuccess redirige a login (lo cablea AuthView).
      await register({
        displayName: name.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        confirmPassword,
        acceptTerms,
      });
      setSuccessMessage(
        "¡Cuenta creada exitosamente! Bienvenido a Trekkin App.",
      );
      setTimeout(onSuccess, 1000);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Error al crear la cuenta. Intenta nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      {errorMessage ? <Banner tone="error" message={errorMessage} /> : null}
      {successMessage ? (
        <Banner tone="success" message={successMessage} />
      ) : null}
      <Field
        label="Nombre Completo"
        value={name}
        onChangeText={setName}
        placeholder="Ej. Mateo Condori"
        error={fieldErrors.displayName}
        icon={<User size={17} color={AndeanTheme.colors.fieldIcon} />}
        autoCapitalize="words"
      />
      <Field
        label="Correo Electrónico"
        value={email}
        onChangeText={setEmail}
        placeholder="andino@trekbolivia.bo"
        error={fieldErrors.email}
        icon={<Mail size={17} color={AndeanTheme.colors.fieldIcon} />}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="Alias de Usuario"
        value={username}
        onChangeText={setUsername}
        placeholder="@caminante_bolivia"
        error={fieldErrors.username}
        icon={<AtSign size={17} color={AndeanTheme.colors.fieldIcon} />}
        autoCapitalize="none"
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres"
        error={fieldErrors.password}
        icon={<Lock size={17} color={AndeanTheme.colors.fieldIcon} />}
        secureTextEntry
        autoCapitalize="none"
      />
      <Field
        label="Verificar Contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repite tu contraseña"
        error={fieldErrors.confirmPassword}
        icon={<Lock size={17} color={AndeanTheme.colors.fieldIcon} />}
        secureTextEntry
        autoCapitalize="none"
      />
      <View style={styles.termsGroup}>
        <Pressable
          onPress={() => setAcceptTerms(!acceptTerms)}
          style={[
            styles.termsCard,
            fieldErrors.acceptTerms ? styles.termsCardError : null,
          ]}
          accessibilityRole="checkbox"
          accessibilityLabel="Aceptar términos y normas de seguridad en montaña"
          accessibilityState={{ checked: acceptTerms }}
        >
          <View
            style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}
          >
            {acceptTerms ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <View style={styles.termsCopy}>
            <View style={styles.termsHeader}>
              <ShieldCheck size={13} color={AndeanTheme.colors.fieldLabel} />
              <Text style={styles.termsTitle}>
                Normas de Seguridad en Montaña
              </Text>
            </View>
            <Text style={styles.termsText}>
              Acepto las normas de seguridad y los términos de uso de Trekkin
              Bolivia.
            </Text>
          </View>
        </Pressable>
        {fieldErrors.acceptTerms ? (
          <View style={styles.termsErrorRow}>
            <AlertCircle size={11} color={AndeanTheme.colors.errorText} />
            <Text style={styles.termsError}>{fieldErrors.acceptTerms}</Text>
          </View>
        ) : null}
      </View>
      <Button title="CREAR CUENTA" onPress={handleSubmit} loading={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  termsGroup: {
    marginBottom: 20,
  },
  termsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 16,
  },
  termsCardError: {
    borderColor: AndeanTheme.colors.errorBorder,
    backgroundColor: AndeanTheme.colors.errorBg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AndeanTheme.colors.fieldBorderStrong,
    backgroundColor: AndeanTheme.colors.sheet,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: AndeanTheme.colors.primaryDark,
    borderColor: AndeanTheme.colors.primaryDark,
  },
  checkMark: {
    color: AndeanTheme.colors.white,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14,
  },
  termsCopy: {
    flex: 1,
    gap: 4,
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: AndeanTheme.colors.inkSecondary,
  },
  termsText: {
    fontSize: 13,
    lineHeight: 19,
    color: AndeanTheme.colors.inkSecondary,
  },
  termsErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingLeft: 4,
  },
  termsError: {
    fontSize: 12,
    color: AndeanTheme.colors.errorText,
    flex: 1,
  },
});
