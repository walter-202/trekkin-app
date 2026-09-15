import type { AccountLogEntry, UserProfile } from "../../domain/types";
import { AccountLogSchema } from "../../domain/userManagement.schemas";

/**
 * HU-10 C7-C8/T11 — Desbloquear cuenta de usuario.
 * Restablece `isBlocked` a false y registra la acción en la bitácora (T7).
 */

export interface UnblockUserPorts {
  getUserProfile: (uid: string) => Promise<UserProfile | null>;
  updateUserProfile: (
    uid: string,
    updates: Partial<UserProfile>,
  ) => Promise<void>;
  createAccountLog: (entry: AccountLogEntry) => Promise<void>;
}

export async function UnblockUserUseCase(
  args: { targetUid: string; actor: UserProfile },
  ports: UnblockUserPorts,
): Promise<void> {
  const targetUid = args.targetUid.trim();
  if (!targetUid) {
    throw new Error("Selecciona un usuario para desbloquear.");
  }
  if (args.actor.uid === targetUid) {
    throw new Error("No puedes desbloquear (ni bloquear) tu propia cuenta.");
  }
  const current = await ports.getUserProfile(targetUid);
  if (!current) {
    throw new Error("El usuario seleccionado ya no existe.");
  }
  if (!current.isBlocked) {
    throw new Error("El usuario ya está activo.");
  }

  await ports.updateUserProfile(targetUid, { isBlocked: false });
  await ports.createAccountLog(
    AccountLogSchema.parse({
      id: `unblk-${targetUid}-${Date.now()}`,
      userId: targetUid,
      action: "unblock",
      actorId: args.actor.uid,
      actorName: args.actor.displayName,
      createdAt: Date.now(),
    }),
  );
}
