import assert from "node:assert/strict";
import {
  ActivityGpxExistsUseCase,
  DeleteActivityGpxUseCase,
  DownloadActivityGpxUseCase,
  SyncActivityGpxUseCase,
  activityGpxStoragePath,
  type ActivityGpxStoragePort,
} from "../core/application/activity/activityGpx";
import type { ActivityGpxMetadata } from "../core/domain/types";
import { stripUndefined } from "../infrastructure/database/sanitizeDoc";

class FakeStorage implements ActivityGpxStoragePort {
  files = new Map<string, Uint8Array>();
  uploads = 0;
  failUploads = 0;
  uploadedFileNames: string[] = [];

  async upload(input: {
    path: string;
    data: string | Uint8Array;
  }): Promise<{ byteSize: number }> {
    this.uploads += 1;
    this.uploadedFileNames.push(
      (input as { fileName?: string }).fileName ?? "",
    );
    if (this.failUploads > 0) {
      this.failUploads -= 1;
      throw new Error("offline");
    }
    const bytes =
      typeof input.data === "string"
        ? new TextEncoder().encode(input.data)
        : input.data;
    this.files.set(input.path, bytes);
    return { byteSize: bytes.byteLength };
  }

  async download(path: string): Promise<Uint8Array> {
    const bytes = this.files.get(path);
    if (!bytes) throw new Error("not found");
    return bytes;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }
}

async function main() {
  const storage = new FakeStorage();
  const transitions: ActivityGpxMetadata[] = [];
  const payload = {
    userId: "user-1",
    activityId: "activity-1",
    fileName: "trekkin_Summit_2026-09-22.gpx",
    content: "<gpx/>",
  };
  const ports = (save: (metadata: ActivityGpxMetadata) => Promise<void>) => ({
    upload: storage.upload.bind(storage),
    download: storage.download.bind(storage),
    exists: storage.exists.bind(storage),
    delete: storage.delete.bind(storage),
    save,
  });
  const result = await SyncActivityGpxUseCase(payload, {
    ...ports(async (metadata) => {
      transitions.push(metadata);
    }),
  });
  assert.equal(result.metadata.status, "uploaded");
  assert.deepEqual(
    transitions.map((m) => m.status),
    ["pending", "uploading", "uploaded"],
  );
  assert.equal(
    result.metadata.storagePath,
    "users/user-1/activities/activity-1/activity.gpx",
  );
  assert.equal(result.metadata.fileName, "activity.gpx");
  assert.deepEqual(storage.uploadedFileNames, ["activity.gpx"]);
  assert.equal(result.metadata.byteSize, 6);
  assert.equal(storage.uploads, 1);

  // P0-1: ni el receipt sin hash ni el payload sin sha256 pueden producir
  // `sha256: undefined` explícito (Firestore rechaza undefined en gpx.sha256).
  assert.equal("sha256" in result.metadata, false);
  assert.equal(
    (transitions[transitions.length - 1] as unknown as Record<string, unknown>)
      .sha256,
    undefined,
  );
  assert.equal(
    "sha256" in (transitions[transitions.length - 1] as unknown as object),
    false,
  );

  // stripUndefined elimina undefined anidados antes de setDoc (defensa en profundidad).
  const sanitized = stripUndefined({
    isSynced: false,
    gpx: { storagePath: "p", sha256: undefined, byteSize: 4 },
    keep: undefined,
    list: [1, undefined, { a: undefined, b: 2 }],
  }) as Record<string, unknown>;
  assert.equal("keep" in sanitized, false);
  assert.deepEqual(sanitized.list, [1, { b: 2 }]);
  const gpx = sanitized.gpx as Record<string, unknown>;
  assert.equal("sha256" in gpx, false);
  assert.equal(gpx.byteSize, 4);

  const bytes = await DownloadActivityGpxUseCase(
    "user-1",
    "activity-1",
    storage,
  );
  assert.equal(new TextDecoder().decode(bytes), "<gpx/>");
  assert.equal(
    await ActivityGpxExistsUseCase("user-1", "activity-1", storage),
    true,
  );
  await DeleteActivityGpxUseCase("user-1", "activity-1", storage);
  assert.equal(
    await ActivityGpxExistsUseCase("user-1", "activity-1", storage),
    false,
  );

  storage.failUploads = 1;
  const failedTransitions: ActivityGpxMetadata[] = [];
  const failed = await SyncActivityGpxUseCase(payload, {
    ...ports(async (metadata) => {
      failedTransitions.push(metadata);
    }),
  });
  assert.equal(failed.metadata.status, "failed");
  assert.match(failed.error?.message ?? "", /offline/);
  assert.deepEqual(
    failedTransitions.map((m) => m.status),
    ["pending", "uploading", "failed"],
  );

  // Retrying the same owner-scoped path is idempotent and does not create chunks.
  const retry = await SyncActivityGpxUseCase(payload, {
    ...ports(async () => {}),
  });
  assert.equal(retry.metadata.status, "uploaded");
  assert.equal(storage.files.size, 1);
  assert.throws(
    () => activityGpxStoragePath("user/other", "activity-1"),
    /usuario/,
  );
  console.log(
    "Activity GPX Storage: success, retry/offline failure, metadata transitions and owner path passed",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
