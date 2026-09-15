import { z } from "zod";

/**
 * HU-05 Compartir — Dominio Share (puro, sin Firebase/RN).
 * El enlace NO duplica la Route: solo transporta el `routeId` (único en
 * Firestore) y, al abrirse, la app recupera la Route completa vía el flujo
 * existente (GetRouteDetailUseCase). No se persiste ninguna colección `shares`.
 */

/** Payload de difusión: enlace único + mensaje presentable con datos de la Route. */
export const SharePayloadSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "El enlace no puede estar vacío")
    .max(500, "El enlace es demasiado largo"),
  message: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(2000, "El mensaje es demasiado largo"),
});

export type SharePayload = z.infer<typeof SharePayloadSchema>;

/** id de ruta extraído de un enlace compartido (`r/{routeId}`). */
export const SharedRouteLinkSchema = z.object({
  routeId: z
    .string()
    .trim()
    .min(1, "El enlace no contiene una ruta válida")
    .max(128, "El enlace no contiene una ruta válida")
    .regex(/^[a-zA-Z0-9_-]+$/, "El enlace no contiene una ruta válida"),
});

export type SharedRouteLink = z.infer<typeof SharedRouteLinkSchema>;

/**
 * Extrae el `routeId` de un enlace de tipo `…/r/{routeId}` (exp://, scheme
 * propio o https). El patrón es determinístico y no depende del prefijo.
 */
export function parseShareLink(url: string): SharedRouteLink | null {
  const match = /\/r\/([a-zA-Z0-9_-]+)/.exec(url.trim());
  if (!match) return null;
  const parsed = SharedRouteLinkSchema.safeParse({ routeId: match[1] });
  return parsed.success ? parsed.data : null;
}
