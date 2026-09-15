import type {
  AccountLogEntry,
  UserProfile,
  UserRole,
} from "../../domain/types";
import { AccountLogSchema } from "../../domain/userManagement.schemas";

/**
 * HU-10 C9-C10/T9 — Asignar rol a un usuario.
 * Roles vigentes: 'user' | 'admin' (HU-09 eliminada; no existe moderador).
 * Protege tu propio rol (evita lockout) y registra la acción en bitácora (T7).
 */

export interface AssignRolePorts {
  getUserProfile: (uid: string) => Promise<UserProfile | null>;
  updateUserProfile: (
    uid: string,
    updates: Partial<UserProfile>,
  ) => Promise<void>;
  createAccountLog: (entry: AccountLogEntry) => Promise<void>;
}

export async function AssignRoleUseCase(
  args: { targetUid: string; role: UserRole; actor: UserProfile },
  ports: AssignRolePorts,
): Promise<void> {
  const targetUid = args.targetUid.trim();
  if (!targetUid) {
    throw new Error("Selecciona un usuario para asignar rol.");
  }
  if (args.role !== "user" && args.role !== "admin") {
    throw new Error('Rol inválido. Solo se admite "user" o "admin".');
  }
  if (args.actor.uid === targetUid) {
    throw new Error("No puedes cambiar el rol de tu propia cuenta.");
  }

  const current = await ports.getUserProfile(targetUid);
  if (!current) {
    throw new Error("El usuario seleccionado ya no existe.");
  }
  if (current.role === args.role) {
    throw new Error("El usuario ya tiene ese rol.");
  }

  await ports.updateUserProfile(targetUid, { role: args.role });
  await ports.createAccountLog(
    AccountLogSchema.parse({
      id: `role-${targetUid}-${Date.now()}`,
      userId: targetUid,
      action: "role_change",
      actorId: args.actor.uid,
      actorName: args.actor.displayName,
      previousRole: current.role,
      newRole: args.role,
      createdAt: Date.now(),
    }),
  );
}
