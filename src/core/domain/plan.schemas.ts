import { z } from 'zod';

/**
 * Clean Architecture — Dominio Planificación (HU-07).
 * Schemas de validación zod. Mensajes en español.
 * Son la única fuente de verdad para los datos de entrada de la planificación.
 */

export const ROUTE_DIFFICULTY_VALUES = ['facil', 'moderado', 'dificil', 'experto'] as const;

export const DifficultySchema = z.enum(ROUTE_DIFFICULTY_VALUES);

export const CoordsSchema = z.object({
  lat: z.number().min(-90, 'Latitud fuera de rango'),
  lng: z.number().min(-180, 'Longitud fuera de rango'),
});

export const PlannedPointSchema = CoordsSchema.extend({
  name: z.string().trim().max(80, 'El nombre del punto es demasiado largo').optional(),
});

/**
 * T2/T3 — Selección de punto inicial provisional y destino provisional.
 * Ambos puntos son obligatorios.
 */
export const SetPlanPointsSchema = z.object({
  start: PlannedPointSchema,
  end: PlannedPointSchema,
});

/**
 * T4 — Guardar borrador. Ambos puntos y título/dificultad son requeridos.
 */
export const SaveDraftSchema = z.object({
  title: z.string().trim().min(1, 'Escribe un nombre para el borrador').max(200, 'El nombre es demasiado largo'),
  difficulty: DifficultySchema,
  start: PlannedPointSchema,
  end: PlannedPointSchema,
});

/**
 * T8 — Confirmar el punto inicial real. Se valida el punto pero se mantiene
 * startPointConfirmed como flag local (no se persiste en Firestore por reglas HU-07).
 */
export const ConfirmStartPointSchema = z.object({
  start: PlannedPointSchema,
});

export type SaveDraftInput = z.infer<typeof SaveDraftSchema>;
export type ConfirmStartPointInput = z.infer<typeof ConfirmStartPointSchema>;