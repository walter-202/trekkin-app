/**
 * HU-02 — Cerrar Sesión.
 * Cierra Firebase y limpia la sesión local persistida.
 * El cierre es seguro sin red: si `signOut` falla (offline), igual se limpia
 * la sesión local y no se relanza (la vista siempre vuelve a AuthView).
 */

export interface LogoutPorts {
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export async function LogoutUserUseCase(ports: LogoutPorts): Promise<void> {
  try {
    await ports.signOut();
  } catch {
    // Offline: Firebase queda pendiente, pero el cierre local no se bloquea.
  } finally {
    await ports.clearSession();
  }
}
