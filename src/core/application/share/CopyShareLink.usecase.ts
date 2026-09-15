import {
  SharePayloadSchema,
  type SharePayload,
} from "../../domain/share.schemas";

/**
 * HU-05 C6 → Copiar enlace.
 * Copia únicamente el enlace generado (no duplica la Route).
 */

export interface CopyShareLinkPorts {
  copyToClipboard: (text: string) => Promise<void>;
}

export async function CopyShareLinkUseCase(
  payload: SharePayload,
  ports: CopyShareLinkPorts,
): Promise<void> {
  const parsed = SharePayloadSchema.parse(payload);
  await ports.copyToClipboard(parsed.url);
}
