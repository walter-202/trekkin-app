import type { TrekkinActivity } from "../../domain/types";

/**
 * HU-06 — Detalle de una actividad del historial (ver recorrido en el mapa).
 * Valida que la actividad pertenezca al usuario autenticado.
 */

export interface GetActivityPorts {
  get: (id: string) => Promise<TrekkinActivity | null>;
}

export interface GetActivityArgs {
  id: string;
  userId: string;
}

export async function GetActivityUseCase(
  args: GetActivityArgs,
  ports: GetActivityPorts,
): Promise<TrekkinActivity | null> {
  const activity = await ports.get(args.id);
  if (!activity) return null;
  if (activity.userId !== args.userId) {
    throw new Error("No puedes ver esta actividad.");
  }
  return activity;
}
