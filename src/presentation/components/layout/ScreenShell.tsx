import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AndeanTheme } from "../../theme";

/**
 * Estructura canónica de pantalla (DESIGN_RULES §3, "capas duales"):
 * shell oscuro (`background`) para cabecera/identidad + hoja blanca
 * (`sheet`, borderTopRadius 36) para controles, datos y CTAs.
 *
 * - `body="scroll"` envuelve el contenido en ScrollView (pantallas simples).
 * - `body="none"` deja el contenido plano para que su FlatList/gestor de
 *   scroll ocupe el flex de la hoja (patrón ExploreView).
 */
interface ScreenShellProps {
  /** Contenido de la zona oscura (badge, título, identidad, acciones de cabecera). */
  header?: React.ReactNode;
  /** Contenido de la hoja clara. */
  children: React.ReactNode;
  body?: "scroll" | "none";
  style?: StyleProp<ViewStyle>;
  darkZoneStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Envuelve todo en KeyboardAvoidingView (teclado siempre visible en forms). */
  keyboard?: boolean;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  header,
  children,
  body = "scroll",
  style,
  darkZoneStyle,
  sheetStyle,
  contentContainerStyle,
  keyboard = false,
}) => {
  const sheet =
    body === "scroll" ? (
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.sheet, sheetStyle]}>{children}</View>
    );

  const bodyNode = (
    <View style={[styles.screen, style]}>
      {header ? (
        <View style={[styles.darkZone, darkZoneStyle]}>{header}</View>
      ) : null}
      {body === "scroll" ? (
        <View style={styles.sheetHost}>{sheet}</View>
      ) : (
        sheet
      )}
    </View>
  );

  if (!keyboard) return bodyNode;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {bodyNode}
    </KeyboardAvoidingView>
  );
};

/** Presets de la hoja clara: usar en vistas y modales en lugar de recrearlos. */
export const sheetStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldHint,
    paddingLeft: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldLabel,
    paddingLeft: 4,
  },
  /** Tarjeta contenedora sobre la hoja (borde suave, fondo hoja). */
  card: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    backgroundColor: AndeanTheme.colors.sheet,
    overflow: "hidden",
  },
  /** Caja apuntada dentro de la hoja (fondo field, para sizes/hints). */
  inset: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: AndeanTheme.colors.fieldBorder,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: AndeanTheme.colors.ink,
    fontSize: 15,
    padding: 0,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: AndeanTheme.colors.successBg,
    borderColor: AndeanTheme.colors.successBorder,
  },
  chipText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: AndeanTheme.colors.primaryDark,
    fontWeight: "800",
  },
  muted: {
    color: AndeanTheme.colors.fieldHint,
    fontSize: 12,
  },
  ink: {
    color: AndeanTheme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  inkSecondary: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
  },
  darkZone: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  sheetHost: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.sheet,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  sheet: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.sheet,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 20,
  },
});
