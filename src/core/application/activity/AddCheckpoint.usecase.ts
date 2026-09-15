import { CreateCheckpointSchema, TrekkinActivitySchema } from '../../domain/activity.schemas';
import type { Checkpoint, CheckpointCategory, TrekkinActivity } from '../../domain/types';

/**
 * HU-08 — Añadir una parada o checkpoint durante la actividad.
 * Caso de uso puro con puertos inyectados.
 * Valida la parada con CreateCheckpointSchema (nombre, categoría, nota opcional, sin fotos).
 * TrekkinActivity.completedCheckpoints conserva exclusivamente los IDs de checkpoints (string[]).
 * El objeto Checkpoint completo se crea y retorna para su uso/presentación en la aplicación.
 */

export interface AddCheckpointInput {
  name: string;
  category: CheckpointCategory;
  lat: number;
  lng: number;
  notes?: string;
  id?: string;
}

export interface AddCheckpointPorts {
  saveLocalActivity?: (activity: TrekkinActivity) => Promise<void>;
}

export function makeCheckpointId(): string {
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function AddCheckpointUseCase(
  args: {
    activity: TrekkinActivity;
    checkpoint: AddCheckpointInput;
  },
  ports?: AddCheckpointPorts
): Promise<{ activity: TrekkinActivity; checkpoint: Checkpoint }> {
  const parsed = CreateCheckpointSchema.parse(args.checkpoint);
  const checkpointId = parsed.id || makeCheckpointId();
  const now = Date.now();

  const createdCheckpoint: Checkpoint = {
    id: checkpointId,
    name: parsed.name,
    category: parsed.category,
    lat: parsed.lat,
    lng: parsed.lng,
    notes: parsed.notes,
    createdAt: now,
  };

  const currentCompleted = args.activity.completedCheckpoints ?? [];
  const updatedCompleted = currentCompleted.includes(checkpointId)
    ? currentCompleted
    : [...currentCompleted, checkpointId];

  const updatedActivity: TrekkinActivity = {
    ...args.activity,
    completedCheckpoints: updatedCompleted,
  };

  TrekkinActivitySchema.parse(updatedActivity);

  if (ports?.saveLocalActivity) {
    await ports.saveLocalActivity(updatedActivity);
  }

  return {
    activity: updatedActivity,
    checkpoint: createdCheckpoint,
  };
}

