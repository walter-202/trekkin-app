import { z } from "zod";
import type { CheckpointCategory, ActivityStatus } from "./types";

/**
 * Clean Architecture — Dominio Validación de Actividades GPS (HU-06 + HU-08).
 * Esquemas Zod unificados con mensajes en español.
 * 100% TypeScript puro, sin dependencias de React Native, Expo ni Firebase.
 */

// ============================================================================
// CHECKPOINTS & PARADAS (HU-08 - Cruz)
// ============================================================================

export const CHECKPOINT_CATEGORY_VALUES: [CheckpointCategory, ...CheckpointCategory[]] = [
  "agua",
  "camping",
  "peligro",
  "vista",
  "descanso",
  "flora_fauna",
  "refugio",
];

export const CheckpointCategorySchema = z.enum(CHECKPOINT_CATEGORY_VALUES, {
  error: "Categoría de parada inválida",
});

export const CoordinatesSchema = z.object({
  lat: z
    .number()
    .min(-90, "Latitud fuera de rango (-90 a 90)")
    .max(90, "Latitud fuera de rango (-90 a 90)"),
  lng: z
    .number()
    .min(-180, "Longitud fuera de rango (-180 a 180)")
    .max(180, "Longitud fuera de rango (-180 a 180)"),
  altitude: z.number().optional(),
  timestamp: z.number().optional(),
});

/**
 * Validación para registrar una nueva parada (checkpoint) durante la actividad.
 * Cumple con: sin fotos obligatorias, solo categoría, nombre y notas opcionales.
 */
export const CreateCheckpointSchema = z.object({
  id: z.string().trim().min(1, "El id es requerido").max(128).optional(),
  name: z
    .string()
    .trim()
    .min(1, "El nombre de la parada es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres"),
  category: CheckpointCategorySchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  notes: z.string().trim().max(1000, "La nota no puede superar los 1000 caracteres").optional(),
  photoUrl: z.string().max(500).optional(),
  createdAt: z.number().optional(),
});

export type CheckpointInput = z.infer<typeof CreateCheckpointSchema>;

// ============================================================================
// PUNTOS GPS GRABADOS (HU-06 - Tapia)
// ============================================================================

/** Punto GPS registrado durante la actividad. */
export const RecordedPointSchema = z.object({
  lat: z
    .number()
    .min(-90, "Latitud fuera de rango")
    .max(90, "Latitud fuera de rango"),
  lng: z
    .number()
    .min(-180, "Longitud fuera de rango")
    .max(180, "Longitud fuera de rango"),
  timestamp: z
    .number()
    .int()
    .positive("El timestamp debe ser un número positivo"),
  accuracy: z.number().min(0, "La precisión no puede ser negativa").optional(),
  altitude: z.number().optional(),
  speed: z.number().min(0, "La velocidad no puede ser negativa").optional(),
});

export type RecordedPointInput = z.infer<typeof RecordedPointSchema>;

/** Razón registrada al finalizar la actividad (para la determinación de estado). */
export const FinishReasonSchema = z.enum(["user_stopped", "reached_end"]);

export type FinishReason = z.infer<typeof FinishReasonSchema>;

// ============================================================================
// ESTADO Y PERSISTENCIA (TrekkinActivity)
// ============================================================================

export const ACTIVITY_STATUS_VALUES: [ActivityStatus, ...ActivityStatus[]] = [
  "in_progress",
  "paused",
  "completed",
  "incomplete",
];

export const ActivityStatusSchema = z.enum(ACTIVITY_STATUS_VALUES, {
  error: "Estado de actividad inválido",
});

/**
 * Esquema de validación para una actividad completa (TrekkinActivity).
 * Alineado con isValidActivity() de firestore.rules.
 */
export const TrekkinActivitySchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "El ID de la actividad es requerido")
    .max(128, "El ID es demasiado largo")
    .regex(/^[a-zA-Z0-9_\-]+$/, "El ID contiene caracteres inválidos"),
  userId: z.string().trim().min(1, "El ID de usuario es requerido").max(128),
  userName: z.string().trim().max(150).default(""),
  routeId: z.string().trim().max(128).default(""),
  routeTitle: z.string().trim().max(200).default(""),
  status: ActivityStatusSchema,
  startedAt: z.number().min(0, "Fecha de inicio inválida"),
  finishedAt: z.number().min(0).optional(),
  distanceCoveredKm: z.number().min(0, "La distancia no puede ser negativa"),
  remainingDistanceKm: z.number().min(0).default(0),
  durationSeconds: z.number().min(0, "La duración no puede ser negativa"),
  recordedPoints: z.array(RecordedPointSchema.or(CoordinatesSchema)).default([]),
  completedCheckpoints: z.array(z.string().trim().max(128)).default([]),
  isSynced: z.boolean().default(false),
  createdAt: z.number().min(0),
});

/**
 * Esquema de datos requeridos para iniciar una grabación GPS.
 */
export const StartActivitySchema = z.object({
  userId: z.string().trim().min(1, "Usuario no autenticado"),
  userName: z.string().trim().max(150).default(""),
  routeId: z.string().trim().max(128).default(""),
  routeTitle: z.string().trim().max(200).default(""),
  initialPosition: CoordinatesSchema.optional(),
});

export type CoordinatesInput = z.infer<typeof CoordinatesSchema>;
export type TrekkinActivityValidated = z.infer<typeof TrekkinActivitySchema>;
export type StartActivityInput = z.infer<typeof StartActivitySchema>;
