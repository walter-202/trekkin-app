import type { RouteModel } from '../../domain/types';

/**
 * HU-07 T6 (lista) — Listar los borradores del usuario.
 * Solo nombres/claves de borradores propios con status 'draft'.
 */

export interface ListDraftsPorts {
  listDrafts: (uid: string) => Promise<RouteModel[]>;
}

export async function ListDraftsUseCase(
  uid: string,
  ports: ListDraftsPorts
): Promise<RouteModel[]> {
  return ports.listDrafts(uid);
}