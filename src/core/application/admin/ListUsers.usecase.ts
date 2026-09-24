import type { UserProfile } from "../../domain/types";
import { UserFiltersSchema } from "../../domain/userManagement.schemas";

/** Opaque continuation token owned by the infrastructure adapter. */
export type UserPageCursor = unknown;

export interface UserPage {
  users: UserProfile[];
  cursor: UserPageCursor | null;
  hasMore: boolean;
}

/**
 * HU-10 C2/T8 — List users in bounded pages and filter each page in memory.
 * Cursor data remains opaque to the application and presentation layers.
 */
export interface ListUsersPorts {
  listUsersPage: (args: {
    cursor: UserPageCursor | null;
    limit: number;
  }) => Promise<UserPage>;
}

export interface ListUsersFilters {
  texto?: string;
  state?: "all" | "active" | "blocked";
  role?: "all" | "user" | "admin";
}

export const USER_PAGE_SIZE = 50;

function compareUsersByCreatedAt(a: UserProfile, b: UserProfile): number {
  const aCreatedAt = a.createdAt;
  const bCreatedAt = b.createdAt;
  if (aCreatedAt == null && bCreatedAt != null) return 1;
  if (aCreatedAt != null && bCreatedAt == null) return -1;
  if (aCreatedAt != null && bCreatedAt != null && aCreatedAt !== bCreatedAt) {
    return bCreatedAt - aCreatedAt;
  }
  return a.uid.localeCompare(b.uid);
}

/** Coordinates one in-flight request per filter generation. */
export class UserPageRequestGuard {
  private generation = 0;
  private activeGeneration: number | null = null;

  reset(): number {
    this.generation += 1;
    return this.generation;
  }

  current(): number {
    return this.generation;
  }

  isCurrent(generation: number): boolean {
    return this.generation === generation;
  }

  begin(generation: number): boolean {
    if (!this.isCurrent(generation) || this.activeGeneration === generation) {
      return false;
    }
    this.activeGeneration = generation;
    return true;
  }

  end(generation: number): void {
    if (this.activeGeneration === generation) this.activeGeneration = null;
  }
}

export function mergeUniqueUserPages(
  existing: UserProfile[],
  incoming: UserProfile[],
  reset: boolean,
): UserProfile[] {
  const merged = reset ? [] : [...existing];
  const seen = new Set(merged.map((user) => user.uid));
  for (const user of incoming) {
    if (!seen.has(user.uid)) {
      seen.add(user.uid);
      merged.push(user);
    }
  }
  return merged.sort(compareUsersByCreatedAt);
}

function parseFilters(filters: ListUsersFilters) {
  return UserFiltersSchema.parse({
    texto: filters.texto ?? "",
    state: filters.state ?? "all",
    role: filters.role ?? "all",
  });
}

function filterAndSortUsers(
  users: UserProfile[],
  parsed: ReturnType<typeof parseFilters>,
) {
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
    .sort(compareUsersByCreatedAt);
}

export async function ListUsersUseCase(
  filters: ListUsersFilters,
  ports: ListUsersPorts,
  cursor: UserPageCursor | null = null,
  limit = USER_PAGE_SIZE,
): Promise<UserPage> {
  const parsedFilters = parseFilters(filters);
  const page = await ports.listUsersPage({ cursor, limit });
  return {
    ...page,
    users: filterAndSortUsers(page.users, parsedFilters),
  };
}
