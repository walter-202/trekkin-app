/**
 * Automated Acceptance Test Suite: HU-10 Gestión de usuarios y roles
 * Clean Architecture - Pure Domain & Application Use Cases
 *
 * Scope:
 * - T1/T8/T14: listado + búsqueda y filtros (ListUsersUseCase + UserFiltersSchema)
 * - T2/T15: detalle de usuario (GetUserDetailUseCase)
 * - T3/T10/T16: bloquear cuenta (BlockUserUseCase) e invalidación de sesión en vivo (verificación)
 * - T3/T11/T17: desbloquear cuenta (UnblockUserUseCase)
 * - T9/T13: asignar rol + control de acceso por rol (roles vigentes user|admin, sin moderador)
 * - T7: bitácora de cuenta (AccountLogSchema)
 */

import {
  UserFiltersSchema,
  AccountLogSchema,
} from "../core/domain/userManagement.schemas";
import type { UserProfile, UserRole } from "../core/domain/types";
import {
  ListUsersUseCase,
  ListUsersPorts,
} from "../core/application/admin/ListUsers.usecase";
import { GetUserDetailUseCase } from "../core/application/admin/GetUserDetail.usecase";
import {
  BlockUserUseCase,
  BlockUserPorts,
} from "../core/application/admin/BlockUser.usecase";
import {
  UnblockUserUseCase,
  UnblockUserPorts,
} from "../core/application/admin/UnblockUser.usecase";
import {
  AssignRoleUseCase,
  AssignRolePorts,
} from "../core/application/admin/AssignRole.usecase";
import {
  LoginUserUseCase,
  LoginPorts,
} from "../core/application/auth/LoginUser.usecase";

interface TestResult {
  id: string;
  hu: "HU-10";
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `HU-10-${results.length + 1}`,
    hu: "HU-10",
    criterion,
    passed,
    detail,
  });
}

const ADMIN: UserProfile = {
  uid: "admin-1",
  email: "admin@trekbolivia.bo",
  displayName: "Admin Principal",
  username: "admin_principal",
  role: "admin",
  isBlocked: false,
  createdAt: 1717000000000,
};

const USERS: UserProfile[] = [
  {
    uid: "u-1",
    email: "mateo@trekbolivia.bo",
    displayName: "Mateo Condori",
    username: "mateo_andes",
    role: "user",
    isBlocked: false,
    createdAt: 1718000000000,
  },
  {
    uid: "u-2",
    email: "lucia@trekbolivia.bo",
    displayName: "Lucía Mamani",
    username: "lucia_altiplano",
    role: "user",
    isBlocked: true,
    createdAt: 1717000000000,
  },
  {
    uid: "u-3",
    email: "poma@trekbolivia.bo",
    displayName: "Christian Poma",
    username: "pomajurado",
    role: "admin",
    isBlocked: false,
    createdAt: 1716500000000,
  },
];

function memoryUserStore(initial: UserProfile[]) {
  const store = new Map(initial.map((u) => [u.uid, { ...u }]));
  return {
    store,
    getUserProfile: async (uid: string) => store.get(uid) ?? null,
    updateUserProfile: async (uid: string, updates: Partial<UserProfile>) => {
      const current = store.get(uid);
      if (!current) throw new Error("not-found");
      store.set(uid, { ...current, ...updates });
    },
  };
}

export async function runUserManagementAcceptanceTests(): Promise<
  TestResult[]
> {
  // =========================================================================
  // T1 — Filtros y búsqueda validados con Zod (dominio)
  // =========================================================================
  const validFilters = UserFiltersSchema.safeParse({
    texto: "mateo",
    state: "all",
    role: "all",
  });
  recordTest(
    "T1: Filtros válidos pasan UserFiltersSchema",
    validFilters.success,
    validFilters.success ? "Filtro aceptado" : JSON.stringify(validFilters),
  );

  const oversized = UserFiltersSchema.safeParse({ texto: "x".repeat(81) });
  recordTest(
    "T1: Búsqueda demasiado larga es rechazada",
    oversized.success === false,
    oversized.success
      ? "Debería rechazar texto de 81 caracteres"
      : "Rechazado correctamente",
  );

  const demoRole = UserFiltersSchema.safeParse({ role: "moderator" });
  recordTest(
    "T9: Rol 'moderator' no existe en los filtros (HU-09 eliminada)",
    demoRole.success === false,
    demoRole.success
      ? "No debería existir rol moderador"
      : "Solo user/admin en filtros",
  );

  // =========================================================================
  // T8/T14 — Listado de usuarios con filtros (ListUsersUseCase)
  // =========================================================================
  const listPorts: ListUsersPorts = { listUsers: async () => USERS };
  const allUsers = await ListUsersUseCase({}, listPorts);
  recordTest(
    "T8/T14: Listado consulta todos los usuarios registrados",
    allUsers.length === 3,
    `Usuarios listados: ${allUsers.length}`,
  );

  const blocked = await ListUsersUseCase({ state: "blocked" }, listPorts);
  recordTest(
    "T14: Filtro por estado 'blocked' devuelve solo bloqueados",
    blocked.length === 1 && blocked[0].uid === "u-2",
    blocked.map((u) => `${u.uid}:isBlocked=${u.isBlocked}`).join(", "),
  );

  const admins = await ListUsersUseCase({ role: "admin" }, listPorts);
  recordTest(
    "T14: Filtro por rol 'admin' devuelve solo administradores",
    admins.length === 1 && admins[0].uid === "u-3",
    admins.map((u) => u.role).join(", "),
  );

  const searched = await ListUsersUseCase({ texto: "lucia" }, listPorts);
  recordTest(
    "T1: Búsqueda por texto encuentra por alias",
    searched.length === 1 && searched[0].uid === "u-2",
    `Coincidencias: ${searched.map((u) => u.username).join(", ")}`,
  );

  // =========================================================================
  // T2/T15 — Detalle de usuario (GetUserDetailUseCase)
  // =========================================================================
  const detail = await GetUserDetailUseCase("u-1", {
    getUserProfile: async (uid) => USERS.find((u) => u.uid === uid) ?? null,
  });
  recordTest(
    "T2/T15: Detalle devuelve la información del usuario seleccionado",
    detail?.email === "mateo@trekbolivia.bo" &&
      detail?.role === "user" &&
      detail?.isBlocked === false,
    `Detalle: ${detail?.displayName} | rol=${detail?.role} | isBlocked=${detail?.isBlocked}`,
  );

  let detailGuardFailed = false;
  try {
    await GetUserDetailUseCase("", { getUserProfile: async () => null });
  } catch {
    detailGuardFailed = true;
  }
  recordTest(
    "T15: Detalle con uid vacío lanza error controlado",
    detailGuardFailed,
    detailGuardFailed ? "Lanza error" : "Debería fallar con uid vacío",
  );

  // =========================================================================
  // T10/T16 — Bloquear usuario (BlockUserUseCase) + bitácora (T7)
  // =========================================================================
  const blockStore = memoryUserStore(USERS);
  const blockLogs: string[] = [];
  const blockPorts: BlockUserPorts = {
    ...blockStore,
    createAccountLog: async (entry) => {
      blockLogs.push(entry.action);
      if (entry.action === "block") {
        recordTest(
          "T7: Bitácora de bloqueo es válida (AccountLogSchema)",
          AccountLogSchema.safeParse(entry).success,
          AccountLogSchema.safeParse(entry).success
            ? "Entrada block válida"
            : "Entrada inválida",
        );
      }
    },
  };

  await BlockUserUseCase({ targetUid: "u-1", actor: ADMIN }, blockPorts);
  const blockedUser = blockStore.store.get("u-1")!;
  recordTest(
    "T10/T16: Bloquear cambia el estado de la cuenta a bloqueada",
    blockedUser.isBlocked === true && blockLogs.includes("block"),
    `isBlocked=${blockedUser.isBlocked} | logAction=block`,
  );

  let selfBlockFailed = false;
  try {
    await BlockUserUseCase({ targetUid: "admin-1", actor: ADMIN }, blockPorts);
  } catch {
    selfBlockFailed = true;
  }
  recordTest(
    "T10: No se puede bloquear la propia cuenta del admin",
    selfBlockFailed,
    selfBlockFailed ? "Autobloqueo rechazado" : "Debería impedir autobloqueo",
  );

  let doubleBlockFailed = false;
  try {
    await BlockUserUseCase({ targetUid: "u-1", actor: ADMIN }, blockPorts);
  } catch {
    doubleBlockFailed = true;
  }
  recordTest(
    "T10: Bloquear una cuenta ya bloqueada lanza error controlado",
    doubleBlockFailed,
    doubleBlockFailed ? "Re-bloqueo rechazado" : "Debería impedir re-bloqueo",
  );

  // T12/T16 — Login rechaza cuentas bloqueadas (integración con HU-02)
  let blockedLoginRejected = false;
  try {
    await LoginUserUseCase(
      { email: "mateo@trekbolivia.bo", password: "password" },
      {
        signIn: async () => ({ uid: "u-1", email: "mateo@trekbolivia.bo" }),
        getProfile: async () => blockStore.store.get("u-1") ?? null,
        createProfile: async () => {},
        saveSession: async () => {},
      } satisfies LoginPorts,
    );
  } catch (err: any) {
    blockedLoginRejected = String(err?.message).includes("bloqueada");
  }
  recordTest(
    "T12/T16: El login (HU-02) impide el acceso a cuentas bloqueadas",
    blockedLoginRejected,
    blockedLoginRejected
      ? "Login bloqueado"
      : "Debería rechazar login de cuenta bloqueada",
  );

  // =========================================================================
  // T11/T17 — Desbloquear usuario (UnblockUserUseCase) + bitácora (T7)
  // =========================================================================
  const unblockStore = memoryUserStore(USERS);
  const unblockLogs: string[] = [];
  const unblockPorts: UnblockUserPorts = {
    ...unblockStore,
    createAccountLog: async (entry) => {
      unblockLogs.push(entry.action);
      if (entry.action === "unblock") {
        recordTest(
          "T7: Bitácora de desbloqueo es válida (AccountLogSchema)",
          AccountLogSchema.safeParse(entry).success,
          AccountLogSchema.safeParse(entry).success
            ? "Entrada unblock válida"
            : "Entrada inválida",
        );
      }
    },
  };

  await UnblockUserUseCase({ targetUid: "u-2", actor: ADMIN }, unblockPorts);
  const unblockedUser = unblockStore.store.get("u-2")!;
  recordTest(
    "T11/T17: Desbloquear restablece la cuenta a activa y habilita el acceso",
    unblockedUser.isBlocked === false && unblockLogs.includes("unblock"),
    `isBlocked=${unblockedUser.isBlocked} | logAction=unblock`,
  );

  // T17 — Tras desbloquear, el login vuelve a funcionar
  let unblockedLogin = false;
  try {
    const profile = await LoginUserUseCase(
      { email: "lucia@trekbolivia.bo", password: "password" },
      {
        signIn: async () => ({ uid: "u-2", email: "lucia@trekbolivia.bo" }),
        getProfile: async () => unblockStore.store.get("u-2") ?? null,
        createProfile: async () => {},
        saveSession: async () => {},
      } satisfies LoginPorts,
    );
    unblockedLogin = !!profile;
  } catch {
    unblockedLogin = false;
  }
  recordTest(
    "T17: El acceso se habilita nuevamente tras el desbloqueo",
    unblockedLogin,
    unblockedLogin
      ? "Login permitido tras desbloqueo"
      : "Debería permitir login",
  );

  // =========================================================================
  // T9 — Asignar rol (AssignRoleUseCase) + bitácora con previousRole/newRole
  // =========================================================================
  const roleStore = memoryUserStore(USERS);
  const roleLogs: Array<{
    action: string;
    previousRole?: UserRole;
    newRole?: UserRole;
  }> = [];
  const rolePorts: AssignRolePorts = {
    ...roleStore,
    createAccountLog: async (entry) => {
      roleLogs.push({
        action: entry.action,
        previousRole: entry.previousRole,
        newRole: entry.newRole,
      });
      if (entry.action === "role_change") {
        recordTest(
          "T7: Bitácora de cambio de rol registra roles previo y nuevo",
          entry.previousRole === "user" && entry.newRole === "admin",
          `previousRole=${entry.previousRole} newRole=${entry.newRole}`,
        );
      }
    },
  };

  await AssignRoleUseCase(
    { targetUid: "u-1", role: "admin", actor: ADMIN },
    rolePorts,
  );
  const promoted = roleStore.store.get("u-1")!;
  recordTest(
    "T9: Asignar rol actualiza el rol del usuario",
    promoted.role === "admin" &&
      roleLogs[0].action === "role_change" &&
      roleLogs[0].previousRole === "user" &&
      roleLogs[0].newRole === "admin",
    `role=${promoted.role} | previousRole=${roleLogs[0].previousRole} newRole=${roleLogs[0].newRole}`,
  );

  // T9/T13: roles vigentes user|admin — se rechaza cualquier otro (ej. moderator)
  let invalidRoleRejected = false;
  try {
    await AssignRoleUseCase(
      { targetUid: "u-3", role: "moderator" as UserRole, actor: ADMIN },
      rolePorts,
    );
  } catch {
    invalidRoleRejected = true;
  }
  recordTest(
    "T9/T13: Se rechaza asignar un rol inexistente (moderator fue eliminado)",
    invalidRoleRejected,
    invalidRoleRejected
      ? "Rol moderator rechazado"
      : "Debería rechazar moderator",
  );

  let selfRoleRejected = false;
  try {
    await AssignRoleUseCase(
      { targetUid: "admin-1", role: "user", actor: ADMIN },
      rolePorts,
    );
  } catch {
    selfRoleRejected = true;
  }
  recordTest(
    "T9: No se puede cambiar el rol de la propia cuenta (evita lockout)",
    selfRoleRejected,
    selfRoleRejected
      ? "Auto-cambio de rol rechazado"
      : "Debería impedir auto-cambio",
  );

  let sameRoleRejected = false;
  try {
    await AssignRoleUseCase(
      { targetUid: "u-3", role: "admin", actor: ADMIN },
      rolePorts,
    );
  } catch {
    sameRoleRejected = true;
  }
  recordTest(
    "T9: Asignar el mismo rol lanza error informativo",
    sameRoleRejected,
    sameRoleRejected
      ? "Rol idéntico rechazado"
      : "Debería avisar que ya tiene ese rol",
  );

  return results;
}

// Ejecución directa: `npx tsx src/tests/user_management_hu10.test.ts`
if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("user_management_hu10"))
) {
  console.log("\n============================================================");
  console.log("       TREKKIN APP — SUITE DE ACEPTACIÓN HU-10              ");
  console.log("============================================================\n");

  runUserManagementAcceptanceTests()
    .then((allResults) => {
      let failedCount = 0;
      allResults.forEach((r) => {
        const statusIcon = r.passed ? "✓ PASS" : "✗ FAIL";
        console.log(`[${statusIcon}] ${r.criterion}`);
        console.log(`        Detalle: ${r.detail}\n`);
        if (!r.passed) failedCount++;
      });

      console.log(
        "------------------------------------------------------------",
      );
      console.log(
        `Total Pruebas: ${allResults.length} | Aprobadas: ${allResults.length - failedCount} | Fallidas: ${failedCount}`,
      );
      console.log(
        "------------------------------------------------------------\n",
      );

      if (failedCount > 0) {
        process.exit(1);
      } else {
        console.log(
          "🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-10 PASARON AL 100%.\n",
        );
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Error fatal al ejecutar pruebas:", err);
      process.exit(1);
    });
}
