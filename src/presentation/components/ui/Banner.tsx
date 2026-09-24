import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AlertCircle, CheckCircle2 } from "lucide-react-native";
import { AndeanTheme } from "../../theme";

/**
 * Banner de estado (hoja clara): error rosado / éxito esmeralda.
 * Para errores por campo usar `Field error=`.
 */
interface BannerProps {
  tone: "error" | "success";
  message: string;
}

export const Banner: React.FC<BannerProps> = ({ tone, message }) => {
  const isError = tone === "error";
  return (
    <View
      style={[styles.base, isError ? styles.error : styles.success]}
      accessibilityRole="alert"
    >
      {isError ? (
        <AlertCircle size={16} color={AndeanTheme.colors.danger} />
      ) : (
        <CheckCircle2 size={16} color={AndeanTheme.colors.primaryDark} />
      )}
      <Text
        style={[styles.text, isError ? styles.errorText : styles.successText]}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  error: {
    backgroundColor: AndeanTheme.colors.errorBg,
    borderColor: AndeanTheme.colors.errorBorder,
  },
  success: {
    backgroundColor: AndeanTheme.colors.successBg,
    borderColor: AndeanTheme.colors.successBorder,
  },
  text: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  errorText: {
    color: AndeanTheme.colors.errorText,
    fontWeight: "500",
  },
  successText: {
    color: AndeanTheme.colors.successText,
    fontWeight: "600",
  },
});
