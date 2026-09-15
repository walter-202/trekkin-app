import {
  SharePayloadSchema,
  type SharePayload,
} from "../../domain/share.schemas";

/**
 * HU-05 C6/C8 — Compartir mediante el medio seleccionado.
 * Delega el envío al share sheet nativo (redes sociales / mensajería del
 * dispositivo). Devuelve si el usuario completó o descartó el envío.
 */

export type ShareSheetResult = "shared" | "dismissed";

export interface PublishShareLinkPorts {
  openShareSheet: (payload: SharePayload) => Promise<ShareSheetResult>;
}

export async function PublishShareLinkUseCase(
  payload: SharePayload,
  ports: PublishShareLinkPorts,
): Promise<ShareSheetResult> {
  const parsed = SharePayloadSchema.parse(payload);
  return ports.openShareSheet(parsed);
}
