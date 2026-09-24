import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ShieldCheck, Lock, LockOpen, ArrowLeft } from "lucide-react-native";
import type {
  AccountLogEntry,
  UserProfile,
  UserRole,
} from "../../../core/domain/types";
import { GetUserDetailUseCase } from "../../../core/application/admin/GetUserDetail.usecase";
import { BlockUserUseCase } from "../../../core/application/admin/BlockUser.usecase";
import { UnblockUserUseCase } from "../../../core/application/admin/UnblockUser.usecase";
import { AssignRoleUseCase } from "../../../core/application/admin/AssignRole.usecase";
import { userProfileService } from "../../../infrastructure/database/userProfileService";
import { accountLogService } from "../../../infrastructure/database/accountLogService";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { AndeanTheme } from "../../theme";
import { Banner } from "../../components/ui";
import { ScreenShell, sheetStyles } from "../../components/layout";
import { ConfirmActionModal } from "./ConfirmActionModal";

interface UserDetailViewProps {
  userId: string;
  onBack: () => void;
}

type PendingAction =
  { type: "block" } | { type: "unblock" } | { type: "role"; role: UserRole };

const ROLE_OPTIONS: Array<{ role: UserRole; label: string }> = [
  { role: "user", label: "Usuario" },
  { role: "admin", label: "Admin" },
];

const successMessageFor = (action: PendingAction, name: string): string => {
  if (action.type === "block")
    return `Cuenta de ${name} bloqueada correctamente.`;
  if (action.type === "unblock")
    return `La cuenta de ${name} está activa nuevamente.`;
  return `Rol de ${name} actualizado a ${action.role === "admin" ? "Administrador" : "Usuario"}.`;
};

/**
 * HU-10 C3-C10/T2 + T3 + T4 + T5 — Detalle de usuario con acciones
 * Bloquear / Desbloquear / Asignar rol, todas con confirmación previa.
 * Solo alcanzable por admin (Gate + hasRole(['admin'])).
 * Capas duales: identidad en shell oscuro, datos/acciones en hoja blanca.
 */
export const UserDetailView: React.FC<UserDetailViewProps> = ({
  userId,
  onBack,
}) => {
  const { currentUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await GetUserDetailUseCase(userId, {
        getUserProfile: (uid) => userProfileService.getUserProfile(uid),
      });
      setUser(data);
      if (!data) setError("El usuario seleccionado ya no existe.");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo cargar el detalle del usuario.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const isSelf = currentUser !== null && currentUser.uid === userId;

  const executeAction = useCallback(async () => {
    if (!confirm || !currentUser || !user) return;
    setActing(true);
    setError(null);
    setSuccess(null);
    const ports = {
      getUserProfile: (uid: string) => userProfileService.getUserProfile(uid),
      updateUserProfile: (uid: string, updates: Partial<UserProfile>) =>
        userProfileService.updateUserProfile(uid, updates),
      createAccountLog: (entry: AccountLogEntry) =>
        accountLogService.createLog(entry),
    };
    try {
      if (confirm.type === "block") {
        await BlockUserUseCase(
          { targetUid: user.uid, actor: currentUser },
          ports,
        );
      } else if (confirm.type === "unblock") {
        await UnblockUserUseCase(
          { targetUid: user.uid, actor: currentUser },
          ports,
        );
      } else {
        await AssignRoleUseCase(
          { targetUid: user.uid, role: confirm.role, actor: currentUser },
          ports,
        );
      }
      setSuccess(successMessageFor(confirm, user.displayName));
      setConfirm(null);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "No se pudo completar la operación.");
    } finally {
      setActing(false);
    }
  }, [confirm, currentUser, user, load]);

  const roleTitle =
    confirm?.type === "role"
      ? `Asignar rol ${confirm.role === "admin" ? "Administrador" : "Usuario"}`
      : "";
  const confirmTitle =
    confirm?.type === "block"
      ? "Bloquear cuenta"
      : confirm?.type === "unblock"
        ? "Desbloquear cuenta"
        : roleTitle;
  const confirmMessage =
    confirm?.type === "block"
      ? `¿Bloquear a ${user?.displayName}? Ya no podrá iniciar sesión y su sesión activa se cerrará.`
      : confirm?.type === "unblock"
        ? `¿Desbloquear a ${user?.displayName}? Podrá volver a iniciar sesión normalmente.`
        : `¿Asignar el rol ${confirm && confirm.type === "role" && confirm.role === "admin" ? "Administrador" : "Usuario"} a ${user?.displayName}?`;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
        <Text style={sheetStyles.muted}>Cargando información del usuario…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Banner tone="error" message={error ?? "Usuario no encontrado."} />
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver a la lista de usuarios"
        >
          <Text style={styles.backBtnText}>Volver a la lista</Text>
        </Pressable>
      </View>
    );
  }

  const handle = user.username ?? user.email.split("@")[0];

  return (
    <ScreenShell
      header={
        <>
          <View style={styles.topBar}>
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={styles.link}
              accessibilityRole="button"
              accessibilityLabel="Volver a la lista de usuarios"
            >
              <ArrowLeft size={16} color={AndeanTheme.colors.primaryLight} />
              <Text style={styles.linkText}>Usuarios</Text>
            </Pressable>
            <View style={styles.badge}>
              <ShieldCheck size={12} color={AndeanTheme.colors.amberLight} />
              <Text style={styles.badgeText}>ADMINISTRACIÓN</Text>
            </View>
          </View>
          <View style={styles.identity}>
            <Text style={styles.title}>{user.displayName}</Text>
            <Text style={styles.handle}>@{handle}</Text>
          </View>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} /> : null}
      {success ? <Banner tone="success" message={success} /> : null}

      <Text style={sheetStyles.sectionTitle}>Información de la cuenta</Text>
      <View style={sheetStyles.card}>
        <InfoRow label="Correo electrónico" value={user.email} />
        <View style={sheetStyles.divider} />
        <InfoRow
          label="Rol actual"
          value={user.role === "admin" ? "Administrador" : "Usuario"}
        />
        <View style={sheetStyles.divider} />
        <InfoRow
          label="Estado de la cuenta"
          value={user.isBlocked ? "Bloqueada" : "Activa"}
        />
      </View>

      {isSelf ? (
        <View style={styles.selfNote}>
          <Text style={styles.selfNoteText}>
            Estás viendo tu propia cuenta: no puedes bloquearte ni cambiarte el
            rol.
          </Text>
        </View>
      ) : (
        <>
          <Text style={sheetStyles.sectionTitle}>Asignar rol</Text>
          <View style={styles.chips}>
            {ROLE_OPTIONS.map((opt) => {
              const active = user.role === opt.role;
              return (
                <Pressable
                  key={opt.role}
                  onPress={() => setConfirm({ type: "role", role: opt.role })}
                  disabled={active}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Asignar rol ${opt.label}`}
                  accessibilityState={{ selected: active, disabled: active }}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {active ? `Rol actual · ${opt.label}` : opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={sheetStyles.actions}>
            <Pressable
              onPress={() =>
                setConfirm({ type: user.isBlocked ? "unblock" : "block" })
              }
              style={[
                styles.actionBtn,
                user.isBlocked ? styles.unblockBtn : styles.blockBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                user.isBlocked ? "Desbloquear cuenta" : "Bloquear cuenta"
              }
            >
              {user.isBlocked ? (
                <LockOpen size={16} color={AndeanTheme.colors.white} />
              ) : (
                <Lock size={16} color={AndeanTheme.colors.white} />
              )}
              <Text style={styles.actionBtnText}>
                {user.isBlocked ? "Desbloquear cuenta" : "Bloquear cuenta"}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <ConfirmActionModal
        visible={confirm !== null}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={
          confirm?.type === "block"
            ? "Sí, bloquear"
            : confirm?.type === "unblock"
              ? "Sí, desbloquear"
              : "Sí, asignar rol"
        }
        tone={confirm?.type === "block" ? "danger" : "primary"}
        loading={acting}
        onConfirm={executeAction}
        onCancel={() => {
          if (!acting) setConfirm(null);
        }}
      />
    </ScreenShell>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  link: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
    fontWeight: "800",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: AndeanTheme.borderRadius.full,
  },
  badgeText: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  identity: { gap: 4 },
  title: {
    color: AndeanTheme.colors.white,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  handle: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { color: AndeanTheme.colors.inkSecondary, fontSize: 12 },
  infoValue: {
    color: AndeanTheme.colors.ink,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: AndeanTheme.colors.successBg,
    borderColor: AndeanTheme.colors.successBorder,
  },
  chipText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  chipTextActive: { color: AndeanTheme.colors.primaryDark },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: AndeanTheme.borderRadius.md,
  },
  blockBtn: { backgroundColor: AndeanTheme.colors.dangerDark },
  unblockBtn: { backgroundColor: AndeanTheme.colors.primaryDark },
  actionBtnText: {
    color: AndeanTheme.colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  selfNote: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: AndeanTheme.borderRadius.md,
    padding: 14,
  },
  selfNoteText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.sheet,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backBtnText: {
    color: AndeanTheme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
});
