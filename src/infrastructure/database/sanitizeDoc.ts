/**
 * Firestore rechaza `Unsupported field value: undefined` en cualquier nivel
 * del documento (p. ej. `gpx.sha256`). Este saneador elimina claves con
 * `undefined` de forma recursiva antes de `setDoc`/`updateDoc`.
 */
export function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Firestore también rechaza `undefined` dentro de arrays: se filtran.
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) out[key] = stripUndefined(entry);
    }
    return out;
  }
  return value;
}
