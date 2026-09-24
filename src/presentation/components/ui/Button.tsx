import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { AndeanTheme } from "../../theme";

/**
 * CTA andino reusable (hoja clara): primaria esmeralda + variantes outline.
 * `icon` líder reemplaza la flecha (p. ej. logout/guardar); sin `icon`,
 * la primaria muestra ArrowRight. Casa: `presentation/components/ui/`.
 */
interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline-green" | "outline-danger" | "outline-muted";
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  icon,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={
            isPrimary
              ? AndeanTheme.colors.white
              : AndeanTheme.colors.primaryDark
          }
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, styles[`${variant}Text` as const]]}>
            {title}
          </Text>
          {isPrimary && !icon ? (
            <ArrowRight size={17} color={AndeanTheme.colors.white} />
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  primary: {
    backgroundColor: AndeanTheme.colors.cta,
    shadowColor: AndeanTheme.colors.cta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  "outline-green": {
    backgroundColor: "transparent",
    borderColor: AndeanTheme.colors.primaryDark,
  },
  "outline-danger": {
    backgroundColor: "transparent",
    borderColor: AndeanTheme.colors.errorBorder,
  },
  "outline-muted": {
    backgroundColor: "transparent",
    borderColor: AndeanTheme.colors.fieldBorder,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  primaryText: {
    color: AndeanTheme.colors.white,
  },
  "outline-greenText": {
    color: AndeanTheme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  "outline-dangerText": {
    color: AndeanTheme.colors.danger,
    letterSpacing: 0.5,
  },
  "outline-mutedText": {
    color: AndeanTheme.colors.inkSecondary,
    letterSpacing: 0.5,
  },
});
