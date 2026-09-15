import type { AccountLogEntry, UserProfile } from "../../domain/types";
import { AccountLogSchema } from "../../domain/userManagement.schemas";

/**
 * HU-10 C5-C6/T10 — Bloquear cuenta de usuario.
 * Cambia `isBlocked` a true (invalida la sesión activa vía suscripción en vivo
 * de AuthContext) y registra la acción en la bitácora (T7).
 */

export interface BlockUserPorts {
  getUserProfile: (uid: string) => Promise<UserProfile | null>;
  updateUserProfile: (
    uid: string,
    updates: Partial<UserProfile>,
  ) => Promise<void>;
  createAccountLog: (entry: AccountLogEntry) => Promise<void>;
}

export async function BlockUserUseCase(
  args: { targetUid: string; actor: UserProfile },
  ports: BlockUserPorts,
): Promise<void> {
  const targetUid = args.targetUid.trim();
  if (!targetUid) {
    throw new Error("Selecciona un usuario para bloquear.");
  }
  if (args.actor.uid === targetUid) {
    throw new Error("No puedes bloquear tu propia cuenta.");
  }
  const current = await ports.getUserProfile(targetUid);
  if (!current) {
    throw new Error("El usuario seleccionado ya no existe.");
  }
  if (current.isBlocked) {
    throw new Error("El usuario ya está bloqueado.");
  }

  await ports.updateUserProfile(targetUid, { isBlocked: true });
  await ports.createAccountLog(
    AccountLogSchema.parse({
      id: `blk-${targetUid}-${Date.now()}`,
      userId: targetUid,
      action: "block",
      actorId: args.actor.uid,
      actorName: args.actor.displayName,
      createdAt: Date.now(),
    }),
  );
}
