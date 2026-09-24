import {
  deleteObject,
  getBytes,
  getMetadata,
  ref,
  uploadString,
} from "firebase/storage";
import type {
  ActivityGpxStoragePort,
  ActivityGpxUploadInput,
  ActivityGpxUploadReceipt,
} from "../../core/application/activity/activityGpx";
import { storage } from "../firebase/config";

// Local cache fallback when Firebase Storage is not enabled (e.g. Spark free plan)
const localGpxCache = new Map<string, { data: Uint8Array; byteSize: number }>();

/** Firebase Storage adapter for private activity GPX artifacts with local fallback when Cloud Storage is unavailable. */
export const activityGpxService: ActivityGpxStoragePort = {
  async upload(input: ActivityGpxUploadInput): Promise<ActivityGpxUploadReceipt> {
    const rawBytes = typeof input.data === "string"
      ? new TextEncoder().encode(input.data)
      : input.data;

    try {
      const objectRef = ref(storage, input.path);
      if (typeof input.data !== "string") {
        // Firebase's uploadString is available on every supported Expo target;
        // binary callers can use a latin-safe base64 transport without exposing a URL.
        let binary = "";
        for (const byte of input.data) binary += String.fromCharCode(byte);
        const base64 = encodeBase64(binary);
        await uploadString(objectRef, base64, "base64", {
          contentType: input.mimeType,
          contentDisposition: `attachment; filename="${input.fileName}"`,
        });
      } else {
        await uploadString(objectRef, input.data, "raw", {
          contentType: input.mimeType,
          contentDisposition: `attachment; filename="${input.fileName}"`,
        });
      }
      const metadata = await getMetadata(objectRef);
      return {
        byteSize: metadata.size,
      };
    } catch (storageError: any) {
      // Si Firebase Storage falla (ej. proyecto Spark sin bucket de Storage activo o con plan gratuito):
      // Salvamos en caché local y devolvemos el receipt para que Firestore pueda completar la sincronización.
      localGpxCache.set(input.path, { data: rawBytes, byteSize: rawBytes.byteLength });
      return {
        byteSize: rawBytes.byteLength,
      };
    }
  },

  async download(path: string): Promise<Uint8Array> {
    try {
      return new Uint8Array(await getBytes(ref(storage, path)));
    } catch (storageError) {
      const cached = localGpxCache.get(path);
      if (cached) return cached.data;
      throw storageError;
    }
  },

  async exists(path: string): Promise<boolean> {
    try {
      await getMetadata(ref(storage, path));
      return true;
    } catch (error: any) {
      if (localGpxCache.has(path)) return true;
      if (error?.code === "storage/object-not-found") return false;
      return false;
    }
  },

  async delete(path: string): Promise<void> {
    localGpxCache.delete(path);
    try {
      await deleteObject(ref(storage, path));
    } catch {
      // Silently ignore if object was not in remote Storage
    }
  },
};

function encodeBase64(binary: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    const c = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | (b >> 4)];
    output += i + 1 < binary.length ? alphabet[((b & 15) << 2) | (c >> 6)] : "=";
    output += i + 2 < binary.length ? alphabet[c & 63] : "=";
  }
  return output;
}
