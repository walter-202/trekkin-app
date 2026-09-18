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
        <User size={16} color={AndeanTheme.colors.textSecondary} />
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
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.lg,
    padding: AndeanTheme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: AndeanTheme.borderRadius.full,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  name: { color: AndeanTheme.colors.text, fontSize: 14, fontWeight: "800" },
  handle: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
  email: { color: AndeanTheme.colors.textMuted, fontSize: 10 },
  tags: { alignItems: "flex-end", gap: 6 },
  roleBadge: {
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 10,
    fontWeight: "800",
  },
  statePill: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: AndeanTheme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statePillBlocked: {
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  stateText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
  },
  stateTextBlocked: {
    color: AndeanTheme.colors.danger,
    fontSize: 10,
    fontWeight: "800",
  },
});
