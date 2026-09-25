/**
 * HU-04 — Verificar espacio libre antes de descargar (puro con puerto inyectado).
 * Compara el tamaño estimado del paquete con el almacenamiento disponible.
 * Si el dispositivo no informa espacio (`unknown`), no bloquea: la UI advierte.
 */

export interface CheckOfflineSpacePorts {
  getFreeDiskBytes: () => Promise<number | null>;
}

export type OfflineSpaceVerdict = "enough" | "insufficient" | "unknown";

export interface OfflineSpaceCheck {
  verdict: OfflineSpaceVerdict;
  freeBytes: number | null;
  requiredBytes: number;
}

export async function CheckOfflineSpaceUseCase(
  requiredBytes: number,
  ports: CheckOfflineSpacePorts,
): Promise<OfflineSpaceCheck> {
  if (!Number.isFinite(requiredBytes) || requiredBytes < 0) {
    throw new Error("El tamaño requerido para la descarga no es válido.");
  }
  let freeBytes: number | null = null;
  try {
    freeBytes = await ports.getFreeDiskBytes();
  } catch {
    freeBytes = null;
  }
  if (freeBytes == null || !Number.isFinite(freeBytes) || freeBytes < 0) {
    return { verdict: "unknown", freeBytes: null, requiredBytes };
  }
  return freeBytes >= requiredBytes
    ? { verdict: "enough", freeBytes, requiredBytes }
    : { verdict: "insufficient", freeBytes, requiredBytes };
}
