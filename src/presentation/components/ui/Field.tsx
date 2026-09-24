import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { Eye, EyeOff, AlertCircle } from "lucide-react-native";
import { AndeanTheme } from "../../theme";

/**
 * Campo andino reusable (hoja clara): micro-label + icono + input + toggle + error.
 * Casa: `presentation/components/ui/` (vía `index.ts`).
 */
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string | null;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  accessibilityLabel?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize,
  accessibilityLabel,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.microLabel}>{label}</Text>
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        {icon}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={AndeanTheme.colors.fieldHint}
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          accessibilityLabel={accessibilityLabel ?? label}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            style={styles.toggleButton}
            accessibilityRole="button"
            accessibilityLabel={
              visible ? `Ocultar ${label}` : `Mostrar ${label}`
            }
            hitSlop={8}
          >
            {visible ? (
              <EyeOff size={17} color={AndeanTheme.colors.fieldIcon} />
            ) : (
              <Eye size={17} color={AndeanTheme.colors.fieldIcon} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <AlertCircle size={11} color={AndeanTheme.colors.errorText} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    marginBottom: 20,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: AndeanTheme.colors.fieldLabel,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputError: {
    borderColor: AndeanTheme.colors.errorBorder,
    backgroundColor: AndeanTheme.colors.errorBg,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: AndeanTheme.colors.ink,
    padding: 0,
  },
  toggleButton: {
    padding: 4,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingLeft: 4,
  },
  error: {
    fontSize: 12,
    color: AndeanTheme.colors.errorText,
    flex: 1,
  },
});
