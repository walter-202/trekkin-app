import { z } from "zod";

/**
 * Clean Architecture — Dominio Actividad (HU-06).
 * Schemas de validación zod. Mensajes en español.
 * Son la única fuente de verdad para los datos de entrada del recorrido.
 */

/** Punto GPS registrado durante la actividad. Compatible con Coordinates. */
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
