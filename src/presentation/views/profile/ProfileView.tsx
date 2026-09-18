import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { ChevronLeft, LogOut, Edit2, Mail, Award } from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { Button } from "../../components/ui";

interface ProfileViewProps {
  onBack?: () => void;
  onOpenEdit: () => void;
  onOpenRecord?: () => void;
  onOpenDownloads?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onBack,
  onOpenEdit,
}) => {
  const { currentUser, logout, isAdmin } = useAuth();

  if (!currentUser) return null;

  const initial = (currentUser.displayName || "?").charAt(0).toUpperCase();
  const roleLabel =
    currentUser.role === "admin" ? "ADMINISTRADOR" : "SENDERISTA";

  return (
    <View style={styles.screen}>
      {/* Cabecera oscura con avatar */}
      <View style={styles.darkZone}>
        <View style={styles.topBar}>
          <View style={styles.titleRow}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                style={styles.iconBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <ChevronLeft size={20} color={AndeanTheme.colors.primary} />
              </Pressable>
            ) : null}
            <Text style={styles.topTitle}>MI PERFIL</Text>
          </View>
          <Pressable
            onPress={onOpenEdit}
            style={styles.editBtn}
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
          >
            <Edit2 size={14} color={AndeanTheme.colors.primary} />
            <Text style={styles.editBtnText}>Editar</Text>
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.displayName}>{currentUser.displayName}</Text>
          <Text style={styles.username}>
            @{currentUser.username || currentUser.email.split("@")[0]}
          </Text>
          <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
            <Award
              size={11}
              color={
                isAdmin
                  ? AndeanTheme.colors.amberLight
                  : AndeanTheme.colors.primaryLight
              }
            />
            <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
              {roleLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Hoja blanca */}
      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          <Text style={styles.sectionTitle}>Información de cuenta</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Mail size={16} color={AndeanTheme.colors.fieldHint} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Correo electrónico</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {currentUser.email}
                </Text>
              </View>
              <View style={styles.readonlyBadge}>
                <Text style={styles.readonlyText}>Solo lectura</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Award size={16} color={AndeanTheme.colors.fieldHint} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Rol</Text>
                <Text style={styles.infoValue}>
                  {isAdmin ? "Administrador" : "Senderista"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="EDITAR PERFIL"
              onPress={onOpenEdit}
              icon={<Edit2 size={16} color={AndeanTheme.colors.white} />}
              accessibilityLabel="Editar perfil"
            />
            <Button
              title="Cerrar Sesión"
              variant="outline-danger"
              onPress={logout}
              icon={<LogOut size={16} color={AndeanTheme.colors.danger} />}
              accessibilityLabel="Cerrar sesión"
            />
          </View>

          <Text style={styles.version}>Trekkin Bolivia · v1.0</Text>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  topTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: AndeanTheme.colors.primaryLight,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: AndeanTheme.colors.primary,
  },
  identity: {
    alignItems: "center",
    gap: 6,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 10,
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
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: "900",
    color: AndeanTheme.colors.primary,
  },
  onlineDot: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: AndeanTheme.colors.primary,
    borderWidth: 2,
    borderColor: AndeanTheme.colors.background,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
    color: AndeanTheme.colors.text,
    textAlign: "center",
  },
  username: {
    fontSize: 14,
    color: AndeanTheme.colors.textSecondary,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  roleBadgeAdmin: {
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    borderColor: "rgba(217, 119, 6, 0.3)",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: AndeanTheme.colors.primaryLight,
  },
  roleTextAdmin: {
    color: AndeanTheme.colors.amberLight,
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
  infoCard: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: AndeanTheme.colors.field,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldHint,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: AndeanTheme.colors.ink,
  },
  readonlyBadge: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readonlyText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: AndeanTheme.colors.fieldHint,
  },
  infoDivider: {
    height: 1,
    backgroundColor: AndeanTheme.colors.fieldBorder,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  version: {
    fontSize: 11,
    color: AndeanTheme.colors.fieldHint,
    textAlign: "center",
  },
});
