/**
 * HU-02 — Cerrar Sesión.
 * Cierra Firebase y limpia la sesión local persistida.
 */

export interface LogoutPorts {
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export async function LogoutUserUseCase(ports: LogoutPorts): Promise<void> {
  try {
    await ports.signOut();
  } finally {
    await ports.clearSession();
  }
}
