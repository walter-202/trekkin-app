/**
 * HU-04 Descarga offline — Validación Zod (fuente de verdad del registro
 * persistido en el dispositivo). Solo `published` es descargable: el detalle
 * ya lo garantiza, pero el esquema lo exige como invariante.
 */

import { z } from "zod";
import type { OfflineDownloadStage } from "./offline";

const pointSchema = z.object({
  name: z.string().trim().min(1).max(150),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  timestamp: z.number().optional(),
});

const boundsSchema = z
  .object({
    minLat: z.number().min(-90).max(90),
    maxLat: z.number().min(-90).max(90),
    minLng: z.number().min(-180).max(180),
    maxLng: z.number().min(-180).max(180),
  })
  .superRefine((val, ctx) => {
    if (val.maxLat < val.minLat) {
      ctx.addIssue({
        code: "custom",
        path: ["maxLat"],
        message: "maxLat debe ser mayor o igual a minLat",
      });
    }
    if (val.maxLng < val.minLng) {
      ctx.addIssue({
        code: "custom",
        path: ["maxLng"],
        message: "maxLng debe ser mayor o igual a minLng",
      });
    }
  });

export const OfflineRouteSchema = z.object({
  routeId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  region: z.string().trim().max(150),
  description: z.string().trim().max(5000),
  startPoint: pointSchema,
  endPoint: pointSchema,
  distanceKm: z.number().min(0),
  durationMinutes: z.number().min(0),
  elevationGainM: z.number().min(0).optional(),
  difficulty: z.enum(["facil", "moderado", "dificil", "experto"]),
  modality: z.enum(["solo", "acompañado"]),
  creatorName: z.string().trim().max(150),
  map: z.object({
    bounds: boundsSchema,
    trailPointCount: z.number().int().min(0),
    checkpointCount: z.number().int().min(0),
  }),
  trail: z.array(coordinateSchema).max(5000),
  checkpoints: z.array(
    z.object({
      id: z.string().min(1).max(128),
      name: z.string().min(1).max(200),
      category: z.enum([
        "agua",
        "camping",
        "peligro",
        "vista",
        "descanso",
        "flora_fauna",
        "refugio",
      ]),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      notes: z.string().max(2000).optional(),
      photoUrl: z.string().max(500).optional(),
      createdAt: z.number(),
    }),
  ).max(100),
  photoUrls: z.array(z.string().max(500)).max(50),
  estimatedSizeMB: z.number().min(0),
  downloadedAt: z.number().int().positive(),
});

export type OfflineRouteValidated = z.infer<typeof OfflineRouteSchema>;

/** Valida el id de ruta en los casos de uso de consulta offline. */
export const OfflineRouteIdSchema = z
  .string()
  .trim()
  .min(1, "La ruta debe tener id")
  .max(128);

export const OfflineDownloadStageSchema = z.enum(["map", "trail", "info"]);

export type OfflineDownloadStageValidated = z.infer<
  typeof OfflineDownloadStageSchema
>;
export { OfflineDownloadStage }; // re-export de tipo para uso en aplicación