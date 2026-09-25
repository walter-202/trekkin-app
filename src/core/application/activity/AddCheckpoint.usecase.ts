import { CreateCheckpointSchema } from "../../domain/activity.schemas";
import type { Checkpoint, CheckpointCategory } from "../../domain/types";
import type { LiveActivity } from "../../domain/activity";

/**
 * HU-08 — Añadir una parada o checkpoint durante la actividad.
 * Caso de uso puro.
 * Valida la parada con CreateCheckpointSchema (nombre, categoría, nota opcional,
 * foto local opcional HU-12). Agrega el checkpoint a liveActivity.newCheckpoints
 * y su id a completedCheckpoints.
 */

export interface AddCheckpointInput {
  name: string;
  category: CheckpointCategory;
  lat: number;
  lng: number;
  notes?: string;
  /** URI local de la foto adjunta al punto (solo dispositivo, sin subir). */
  photoUrl?: string;
  id?: string;
}

export function makeCheckpointId(): string {
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AddCheckpointUseCase(
  activity: LiveActivity,
  input: AddCheckpointInput,
): { activity: LiveActivity; checkpoint: Checkpoint } {
  const parsed = CreateCheckpointSchema.parse(input);
  const checkpointId = parsed.id || makeCheckpointId();
  const now = Date.now();

  const createdCheckpoint: Checkpoint = {
    id: checkpointId,
    name: parsed.name,
    category: parsed.category,
    lat: parsed.lat,
    lng: parsed.lng,
    notes: parsed.notes,
    photoUrl: parsed.photoUrl,
    createdAt: now,
  };

  const currentCompleted = activity.completedCheckpoints ?? [];
  const updatedCompleted = currentCompleted.includes(checkpointId)
    ? currentCompleted
    : [...currentCompleted, checkpointId];

  const currentNew = activity.newCheckpoints ?? [];
  const updatedNew = [...currentNew, createdCheckpoint];

  const updatedActivity: LiveActivity = {
    ...activity,
    completedCheckpoints: updatedCompleted,
    newCheckpoints: updatedNew,
    updatedAt: now,
  };

  return {
    activity: updatedActivity,
    checkpoint: createdCheckpoint,
  };
}
