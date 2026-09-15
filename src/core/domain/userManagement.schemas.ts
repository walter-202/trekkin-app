import { z } from "zod";

/**
 * HU-10 — Gestión de usuarios (dominio puro, sin Firebase/RN).
 * Fuente de verdad de filtros del listado y de la bitácora de cuentas.
 * Roles vigentes: 'user' | 'admin' (HU-09 eliminada por el equipo).
 */

/** Filtros del módulo "Gestión de usuarios" (T1). */
export const UserFiltersSchema = z.object({
  texto: z
    .string()
    .trim()
    .max(80, "La búsqueda es demasiado larga")
    .default(""),
  state: z.enum(["all", "active", "blocked"]).default("all"),
  role: z.enum(["all", "user", "admin"]).default("all"),
});

export type UserFilters = z.infer<typeof UserFiltersSchema>;

/** Entrada de bitácora de cuenta (T7): bloqueo, desbloqueo o cambio de rol. */
export const AccountLogSchema = z.object({
  id: z.string().trim().min(1, "El registro debe tener id").max(128),
  userId: z.string().trim().min(1).max(128),
  action: z.enum(["block", "unblock", "role_change"], {
    error: "Acción de bitácora inválida",
  }),
  actorId: z.string().trim().min(1).max(128),
  actorName: z.string().trim().max(150).optional(),
  previousRole: z.enum(["user", "admin"]).optional(),
  newRole: z.enum(["user", "admin"]).optional(),
  createdAt: z.number(),
});

export type AccountLogValidated = z.infer<typeof AccountLogSchema>;
