import { z } from "zod";

/**
 * HU-03 Explorar — Dominio Route (puro, sin Firebase/RN).
 * RouteModel vive en `types.ts`; aquí solo validación (fuente de verdad).
 * Criterios: catálogo público/aprobado (status=published), búsqueda/filtro,
 * detalle con descripción/inicio/final/métricas/características/puntos relevantes.
 */

const coordinateSchema = z.object({
  lat: z.number().min(-90, "Latitud inválida").max(90, "Latitud inválida"),
  lng: z.number().min(-180, "Longitud inválida").max(180, "Longitud inválida"),
  altitude: z.number().optional(),
  timestamp: z.number().optional(),
});

const pointSchema = z.object({
  name: z.string().trim().min(1, "El punto debe tener nombre").max(150),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Validación de Route completa (detalle). Solo `published` es visible en catálogo. */
export const RouteSchema = z.object({
  id: z.string().trim().min(1, "La ruta debe tener id").max(128),
  title: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200),
  description: z.string().trim().max(5000).default(""),
  region: z.string().trim().max(150).default(""),
  startPoint: pointSchema,
  endPoint: pointSchema,
  distanceKm: z
    .number({ error: "La distancia debe ser un número" })
    .min(0, "La distancia no puede ser negativa"),
  durationMinutes: z
    .number({ error: "La duración debe ser un número" })
    .min(0)
    .default(0),
  elevationGainM: z.number().min(0).optional(),
  difficulty: z.enum(["facil", "moderado", "dificil", "experto"], {
    error: "Dificultad inválida",
  }),
  modality: z.enum(["solo", "acompañado"]).default("acompañado"),
  status: z.enum(["draft", "in_review", "published", "rejected"]),
  isPrivate: z.boolean().default(false),
  creatorId: z.string().trim().min(1).max(128),
  creatorName: z.string().trim().max(150).default(""),
  waypoints: z.array(coordinateSchema).max(5000).default([]),
  checkpoints: z
    .array(
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
    )
    .max(100)
    .default([]),
  photos: z.array(z.string().max(500)).max(50).default([]),
  artifacts: z
    .object({
      version: z.number().int().positive(),
      gpx: z.object({
        kind: z.literal("gpx"),
        version: z.number().int().positive(),
        storagePath: z.string().trim().min(1).max(500),
        fileName: z.literal("route.gpx"),
        mimeType: z.literal("application/gpx+xml"),
        byteSize: z.number().int().nonnegative(),
        sha256: z.string().trim().regex(/^[0-9a-fA-F]{64}$/).optional(),
        status: z.enum(["pending", "uploading", "uploaded", "failed"]),
        updatedAt: z.number(),
        error: z.string().max(500).optional(),
      }),
      pmtiles: z.object({
        kind: z.literal("pmtiles"),
        version: z.number().int().positive(),
        storagePath: z.string().trim().min(1).max(500),
        fileName: z.literal("basemap.pmtiles"),
        mimeType: z.literal("application/vnd.pmtiles"),
        byteSize: z.number().int().nonnegative(),
        sha256: z.string().trim().regex(/^[0-9a-fA-F]{64}$/).optional(),
        status: z.enum(["pending", "uploading", "uploaded", "failed"]),
        updatedAt: z.number(),
        error: z.string().max(500).optional(),
      }),
    })
    .optional(),
});

export type RouteValidated = z.infer<typeof RouteSchema>;

/**
 * Parámetros de búsqueda/filtro (HU-03 C3/C4).
 * Todo opcional; la UI solo envía lo que el usuario selecciona.
 */
export const RouteFiltersSchema = z
  .object({
    texto: z.string().trim().max(200).default(""),
    dificultad: z.enum(["facil", "moderado", "dificil", "experto"]).optional(),
    distanciaMinKm: z
      .number()
      .min(0, "La distancia mínima no puede ser negativa")
      .optional(),
    distanciaMaxKm: z
      .number()
      .min(0, "La distancia máxima no puede ser negativa")
      .optional(),
    region: z.string().trim().max(150).optional(),
    modalidad: z.enum(["solo", "acompañado"]).optional(),
  })
  .refine(
    (v) =>
      v.distanciaMinKm === undefined ||
      v.distanciaMaxKm === undefined ||
      v.distanciaMinKm <= v.distanciaMaxKm,
    "La distancia mínima no puede ser mayor que la máxima",
  );

export type RouteFilters = z.infer<typeof RouteFiltersSchema>;
