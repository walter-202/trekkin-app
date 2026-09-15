import type { UserProfile } from "../../domain/types";
import { UserFiltersSchema } from "../../domain/userManagement.schemas";

/**
 * HU-10 C2/T8 — Listar usuarios registrados + búsqueda y filtros (T1).
 * Puro: recibe el listado vía puerto y filtra en memoria con Zod.
 */

export interface ListUsersPorts {
  listUsers: (limit?: number) => Promise<UserProfile[]>;
}

export interface ListUsersFilters {
  texto?: string;
  state?: "all" | "active" | "blocked";
  role?: "all" | "user" | "admin";
}

export async function ListUsersUseCase(
  filters: ListUsersFilters,
  ports: ListUsersPorts,
): Promise<UserProfile[]> {
  const parsed = UserFiltersSchema.parse({
    texto: filters.texto ?? "",
    state: filters.state ?? "all",
    role: filters.role ?? "all",
  });

  const users = await ports.listUsers();
  const q = parsed.texto.toLowerCase();

  return users
    .filter((u) => {
      if (parsed.state === "active" && u.isBlocked) return false;
      if (parsed.state === "blocked" && !u.isBlocked) return false;
      if (parsed.role !== "all" && u.role !== parsed.role) return false;
      if (!q) return true;
      return [u.displayName, u.username ?? "", u.email]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
