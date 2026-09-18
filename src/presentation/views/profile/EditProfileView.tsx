import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import {
  ChevronLeft,
  User as UserIcon,
  Mail,
  Lock,
  Check,
  AlertCircle,
} from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { Banner, Button } from "../../components/ui";
import { UpdateProfileSchema } from "../../../core/domain/auth.schemas";

interface EditProfileViewProps {
  onBack: () => void;
  onSuccess?: () => void;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  onBack,
  onSuccess,
}) => {
  const { currentUser, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || "",
  );
  const [username, setUsername] = useState(
    currentUser?.username || currentUser?.email.split("@")[0] || "",
  );
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    username?: string;
  }>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!currentUser) return null;

  const previewInitial = (displayName.trim() || currentUser.displayName || "?")
    .charAt(0)
    .toUpperCase();

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // HU-02 C11: solo identidad (displayName/username); el resto se preserva.
    const validation = UpdateProfileSchema.safeParse({
      displayName,
      username,
    });

    if (!validation.success) {
      const mapped: typeof fieldErrors = {};
      let general: string | null = null;
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as keyof typeof fieldErrors;
        if ((key === "displayName" || key === "username") && !mapped[key]) {
          mapped[key] = issue.message;
        } else if (!general) {
          general = issue.message;
        }
      }
      setFieldErrors(mapped);
      setErrorMsg(general ?? "Revisa los datos introducidos.");
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      await updateProfile(validation.data);
      setSuccessMsg("Perfil actualizado correctamente.");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBack();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Cabecera oscura con preview en vivo */}
      <View style={styles.darkZone}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            style={styles.iconBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Descartar y volver"
          >
            <ChevronLeft size={20} color={AndeanTheme.colors.primary} />
          </Pressable>
          <Text style={styles.topTitle}>✦ Editar Perfil</Text>
          <View style={styles.iconSpacer} />
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{previewInitial}</Text>
          </View>
          <Text style={styles.previewName}>
            {displayName.trim() || currentUser.displayName}
          </Text>
          <Text style={styles.previewAlias}>
            @{username.replace(/^@/, "") || currentUser.username || "usuario"}
          </Text>
        </View>
      </View>

      {/* Hoja blanca */}
      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {errorMsg ? <Banner tone="error" message={errorMsg} /> : null}
          {successMsg ? <Banner tone="success" message={successMsg} /> : null}

          <Text style={styles.sectionTitle}>Datos editables</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre Completo</Text>
            <View
              style={[
                styles.inputRow,
                fieldErrors.displayName && styles.inputError,
              ]}
            >
              <UserIcon size={17} color={AndeanTheme.colors.fieldIcon} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Tu nombre completo"
                placeholderTextColor={AndeanTheme.colors.fieldHint}
                autoCapitalize="words"
                maxLength={150}
                accessibilityLabel="Nombre completo"
              />
            </View>
            {fieldErrors.displayName ? (
              <View style={styles.errorRow}>
                <AlertCircle size={11} color={AndeanTheme.colors.errorText} />
                <Text style={styles.errorText}>{fieldErrors.displayName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Alias de Usuario</Text>
            <View
              style={[
                styles.inputRow,
                fieldErrors.username && styles.inputError,
              ]}
            >
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={styles.input}
                value={username.replace(/^@/, "")}
                onChangeText={(val) => setUsername(val.replace(/^@/, ""))}
                placeholder="caminante_bolivia"
                placeholderTextColor={AndeanTheme.colors.fieldHint}
                autoCapitalize="none"
                maxLength={150}
                accessibilityLabel="Alias de usuario"
              />
              <Check size={14} color={AndeanTheme.colors.primaryDark} />
            </View>
            <Text style={styles.hint}>
              Solo letras, números, puntos y guion bajo.
            </Text>
            {fieldErrors.username ? (
              <View style={styles.errorRow}>
                <AlertCircle size={11} color={AndeanTheme.colors.errorText} />
                <Text style={styles.errorText}>{fieldErrors.username}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <View style={styles.readonlyBadge}>
                <Text style={styles.readonlyText}>Solo lectura</Text>
              </View>
            </View>
            <View style={[styles.inputRow, styles.inputDisabled]}>
              <Mail size={17} color={AndeanTheme.colors.fieldHint} />
              <TextInput
                style={[styles.input, styles.inputDisabledText]}
                value={currentUser.email}
                editable={false}
                accessibilityLabel="Correo electrónico (solo lectura)"
              />
              <Lock size={14} color={AndeanTheme.colors.fieldHint} />
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title={saving ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
              onPress={handleSave}
              loading={saving}
              disabled={saving || !!successMsg}
              icon={
                saving ? undefined : (
                  <Check size={16} color={AndeanTheme.colors.white} />
                )
              }
              accessibilityLabel="Guardar cambios del perfil"
            />
            <Button
              title="Descartar"
              variant="outline-muted"
              onPress={onBack}
              accessibilityLabel="Descartar cambios y volver"
            />
          </View>
        </ScrollView>
      </View>
    </View>
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
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
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
  iconSpacer: {
    width: 44,
  },
  topTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: AndeanTheme.colors.primaryLight,
  },
  identity: {
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 4,
    borderColor: AndeanTheme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: "900",
    color: AndeanTheme.colors.primary,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "900",
    color: AndeanTheme.colors.text,
    textAlign: "center",
  },
  previewAlias: {
    fontSize: 14,
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
    gap: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldHint,
    paddingLeft: 4,
    marginBottom: -12,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldLabel,
    paddingLeft: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
  },
  inputError: {
    borderColor: AndeanTheme.colors.errorBorder,
    backgroundColor: AndeanTheme.colors.errorBg,
  },
  inputDisabled: {
    backgroundColor: AndeanTheme.colors.field,
    opacity: 0.75,
  },
  inputDisabledText: {
    color: AndeanTheme.colors.fieldHint,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: AndeanTheme.colors.ink,
    padding: 0,
  },
  atPrefix: {
    fontSize: 15,
    fontWeight: "800",
    color: AndeanTheme.colors.primaryDark,
  },
  hint: {
    fontSize: 11,
    color: AndeanTheme.colors.fieldHint,
    paddingLeft: 4,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: AndeanTheme.colors.errorText,
    flex: 1,
  },
  readonlyBadge: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  readonlyText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldHint,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
});
