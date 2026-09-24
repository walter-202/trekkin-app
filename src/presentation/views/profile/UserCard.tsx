import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { User } from "lucide-react-native";
import type { UserProfile } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

const roleLabel: Record<UserProfile["role"], string> = {
  user: "Usuario",
  admin: "Administrador",
};

/**
 * HU-10 C2 — Tarjeta resumen de un usuario (nombre, @alias, correo, rol y estado).
 * Colocalizada en `views/profile/` (un solo uso); sin lógica de negocio.
 * Hoja clara: fondo sheet, bordes fieldBorder, pills de estado.
 */
export const UserCard: React.FC<{
  user: UserProfile;
  onPress: () => void;
}> = ({ user, onPress }) => {
  const blocked = user.isBlocked;
  const handle = user.username ?? user.email.split("@")[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${user.displayName}`}
    >
      <View style={styles.avatar}>
        <User size={16} color={AndeanTheme.colors.fieldIcon} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {user.displayName}
        </Text>
        <Text style={styles.handle} numberOfLines={1}>
          @{handle}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
      </View>
      <View style={styles.tags}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel[user.role]}</Text>
        </View>
        <View style={[styles.statePill, blocked && styles.statePillBlocked]}>
          <Text style={[styles.stateText, blocked && styles.stateTextBlocked]}>
            {blocked ? "Bloqueado" : "Activo"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: AndeanTheme.borderRadius.lg,
    padding: AndeanTheme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: AndeanTheme.borderRadius.full,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  name: { color: AndeanTheme.colors.ink, fontSize: 14, fontWeight: "800" },
  handle: { color: AndeanTheme.colors.inkSecondary, fontSize: 11 },
  email: { color: AndeanTheme.colors.fieldHint, fontSize: 10 },
  tags: { alignItems: "flex-end", gap: 6 },
  roleBadge: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: AndeanTheme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    color: AndeanTheme.colors.amber,
    fontSize: 10,
    fontWeight: "800",
  },
  statePill: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.successBorder,
    backgroundColor: AndeanTheme.colors.successBg,
    borderRadius: AndeanTheme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statePillBlocked: {
    borderColor: AndeanTheme.colors.errorBorder,
    backgroundColor: AndeanTheme.colors.errorBg,
  },
  stateText: {
    color: AndeanTheme.colors.successText,
    fontSize: 10,
    fontWeight: "800",
  },
  stateTextBlocked: {
    color: AndeanTheme.colors.errorText,
    fontSize: 10,
    fontWeight: "800",
  },
});
