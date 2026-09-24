import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { AndeanTheme } from "../../theme";

/**
 * HU-10 C3-C10/T4 — Modal de confirmación reusable para acciones de cuenta
 * (Bloquear / Desbloquear / Cambiar rol). Previene acciones accidentales.
 */
interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  tone,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const danger = tone === "danger";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={styles.card}>
          <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
            <ShieldAlert
              size={18}
              color={
                danger
                  ? AndeanTheme.colors.danger
                  : AndeanTheme.colors.primaryLight
              }
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancelar operación"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.confirmBtn,
                danger && styles.confirmBtnDanger,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color={AndeanTheme.colors.white} size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: AndeanTheme.borderRadius.xl,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: AndeanTheme.borderRadius.full,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDanger: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  title: {
    color: AndeanTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: AndeanTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: AndeanTheme.borderRadius.md,
    backgroundColor: AndeanTheme.colors.cta,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDanger: { backgroundColor: AndeanTheme.colors.dangerDark },
  confirmText: {
    color: AndeanTheme.colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
