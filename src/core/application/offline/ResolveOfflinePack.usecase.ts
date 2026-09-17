import { OfflinePackPathSchema } from "../../domain/offline.schemas";
import {
  resolveOfflinePack,
  type DetectMapPackInput,
  type ResolvedOfflinePack,
} from "../../domain/mapPackFormats";

/**
 * HU-04 — Resuelve si un path es un pack V1 (PMTiles) o V2 (MBTiles).
 * No descarga ni pinta: solo clasifica. El renderer usa `protocolUrl`.
 */
export function ResolveOfflinePackUseCase(
  input: DetectMapPackInput,
): ResolvedOfflinePack {
  const path = OfflinePackPathSchema.parse(input.path);
  return resolveOfflinePack({
    path,
    headerBytes: input.headerBytes,
  });
}
