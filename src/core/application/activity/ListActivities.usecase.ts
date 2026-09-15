import type { TrekkinActivity } from "../../domain/types";

/**
 * HU-06 — Historial personal: listar actividades del usuario actual.
 * Solamente el dueño tiene acceso (reglas `activities` ya lo garantizan).
 */

export interface ListActivitiesPorts {
  listByUser: (uid: string) => Promise<TrekkinActivity[]>;
}

export async function ListActivitiesUseCase(
  uid: string,
  ports: ListActivitiesPorts,
): Promise<TrekkinActivity[]> {
  const items = await ports.listByUser(uid);
  return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
