import type { UserProfile } from "../../domain/types";

/**
 * HU-10 C3-C4/T15 — Detalle de un usuario seleccionado.
 * Puro: delega en el puerto de lectura.
 */

export interface GetUserDetailPorts {
  getUserProfile: (uid: string) => Promise<UserProfile | null>;
}

export async function GetUserDetailUseCase(
  uid: string,
  ports: GetUserDetailPorts,
): Promise<UserProfile | null> {
  const targetUid = uid.trim();
  if (!targetUid) {
    throw new Error("Selecciona un usuario para ver su detalle.");
  }
  return ports.getUserProfile(targetUid);
}
