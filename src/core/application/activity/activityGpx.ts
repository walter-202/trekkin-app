import type {
  ActivityGpxMetadata,
  ActivityGpxUploadStatus,
} from "../../domain/types";

export type {
  ActivityGpxMetadata,
  ActivityGpxUploadStatus,
} from "../../domain/types";

export const ACTIVITY_GPX_MIME_TYPE = "application/gpx+xml" as const;
export const ACTIVITY_GPX_FILE_NAME = "activity.gpx" as const;
export const ACTIVITY_GPX_MAX_BYTES = 10 * 1024 * 1024;

export interface ActivityGpxUploadInput {
  path: string;
  data: string | Uint8Array;
  mimeType: typeof ACTIVITY_GPX_MIME_TYPE;
  fileName: string;
}

export interface ActivityGpxUploadReceipt {
  byteSize?: number;
  sha256?: string;
}

/** Port implemented by Firebase Storage (or a fake in pure tests). */
export interface ActivityGpxStoragePort {
  upload: (input: ActivityGpxUploadInput) => Promise<ActivityGpxUploadReceipt>;
  download: (path: string) => Promise<Uint8Array>;
  exists: (path: string) => Promise<boolean>;
  delete: (path: string) => Promise<void>;
}

export interface ActivityGpxMetadataPort {
  save: (metadata: ActivityGpxMetadata) => Promise<void>;
}

export interface ActivityGpxPayload {
  userId: string;
  activityId: string;
  fileName?: string;
  mimeType?: typeof ACTIVITY_GPX_MIME_TYPE;
  content: string | Uint8Array;
  byteSize?: number;
  sha256?: string;
}

export interface ActivityGpxSyncResult {
  metadata: ActivityGpxMetadata;
  error?: Error;
}

function assertSegment(value: string, label: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`El ${label} de actividad no es válido.`);
  }
  return value;
}

/** Stable private path policy. The path is also enforced by Storage rules. */
export function activityGpxStoragePath(
  userId: string,
  activityId: string,
): string {
  return `users/${assertSegment(userId, "usuario")}/activities/${assertSegment(activityId, "id")}/${ACTIVITY_GPX_FILE_NAME}`;
}

function definedOnly(
  extra: Partial<ActivityGpxMetadata>,
): Partial<ActivityGpxMetadata> {
  const out: Partial<ActivityGpxMetadata> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) {
      out[key as keyof ActivityGpxMetadata] = value as never;
    }
  }
  return out;
}

function transition(
  payload: ActivityGpxPayload,
  status: ActivityGpxUploadStatus,
  extra: Partial<ActivityGpxMetadata> = {},
): ActivityGpxMetadata {
  return {
    storagePath: activityGpxStoragePath(payload.userId, payload.activityId),
    // The Storage object and Firestore metadata deliberately use one stable
    // filename. ExportTrackFile may choose a friendly local-share filename,
    // but it must not diverge from the Storage rules/path contract.
    fileName: ACTIVITY_GPX_FILE_NAME,
    mimeType: payload.mimeType ?? ACTIVITY_GPX_MIME_TYPE,
    ...(payload.byteSize === undefined ? {} : { byteSize: payload.byteSize }),
    ...(payload.sha256 === undefined ? {} : { sha256: payload.sha256 }),
    status,
    updatedAt: Date.now(),
    // Firestore no admite `undefined` explícito (p. ej. gpx.sha256 cuando el
    // receipt local no trae hash): las claves definidas con `undefined` se omiten.
    ...definedOnly(extra),
  };
}

/**
 * Uploads one deterministic artifact and records every state transition. A
 * failed upload is returned as `failed` so callers can keep the local archive
 * and retry later; metadata persistence failures never erase the local file.
 */
export async function SyncActivityGpxUseCase(
  payload: ActivityGpxPayload,
  ports: ActivityGpxStoragePort & ActivityGpxMetadataPort,
): Promise<ActivityGpxSyncResult> {
  const pending = transition(payload, "pending");
  await ports.save(pending);

  const uploading = transition(payload, "uploading");
  await ports.save(uploading);

  try {
    const receipt = await ports.upload({
      path: uploading.storagePath,
      data: payload.content,
      mimeType: uploading.mimeType,
      fileName: uploading.fileName,
    });
    const uploaded = transition(payload, "uploaded", {
      byteSize: receipt.byteSize ?? payload.byteSize,
      sha256: receipt.sha256 ?? payload.sha256,
    });
    await ports.save(uploaded);
    return { metadata: uploaded };
  } catch (cause: unknown) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    const failed = transition(payload, "failed", { error: error.message });
    try {
      await ports.save(failed);
    } catch {
      // The caller still owns the local retry queue when metadata is offline.
    }
    return { metadata: failed, error };
  }
}

export async function DownloadActivityGpxUseCase(
  userId: string,
  activityId: string,
  ports: Pick<ActivityGpxStoragePort, "download">,
): Promise<Uint8Array> {
  return ports.download(activityGpxStoragePath(userId, activityId));
}

export async function ActivityGpxExistsUseCase(
  userId: string,
  activityId: string,
  ports: Pick<ActivityGpxStoragePort, "exists">,
): Promise<boolean> {
  return ports.exists(activityGpxStoragePath(userId, activityId));
}

export async function DeleteActivityGpxUseCase(
  userId: string,
  activityId: string,
  ports: Pick<ActivityGpxStoragePort, "delete">,
): Promise<void> {
  await ports.delete(activityGpxStoragePath(userId, activityId));
}
