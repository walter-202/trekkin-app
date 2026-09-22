import { z } from "zod";

const artifactStatusSchema = z.enum([
  "pending",
  "uploading",
  "uploaded",
  "failed",
]);

export const RouteArtifactMetadataSchema = z.object({
  kind: z.enum(["gpx", "pmtiles"]),
  version: z.number().int().positive(),
  storagePath: z.string().trim().min(1).max(500),
  fileName: z.enum(["route.gpx", "basemap.pmtiles"]),
  mimeType: z.enum(["application/gpx+xml", "application/vnd.pmtiles"]),
  byteSize: z.number().int().nonnegative(),
  sha256: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{64}$/, "sha256 debe ser un digest hexadecimal de 64 caracteres")
    .optional(),
  status: artifactStatusSchema,
  updatedAt: z.number(),
  error: z.string().max(500).optional(),
});

export const RoutePublicationArtifactsSchema = z.object({
  version: z.number().int().positive(),
  gpx: RouteArtifactMetadataSchema,
  pmtiles: RouteArtifactMetadataSchema,
});

export type RouteArtifactMetadataValidated = z.infer<
  typeof RouteArtifactMetadataSchema
>;
export type RoutePublicationArtifactsValidated = z.infer<
  typeof RoutePublicationArtifactsSchema
>;
