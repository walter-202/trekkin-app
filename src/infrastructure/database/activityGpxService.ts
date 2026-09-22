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

/** Firebase Storage adapter for private activity GPX artifacts. */
export const activityGpxService: ActivityGpxStoragePort = {
  async upload(input: ActivityGpxUploadInput): Promise<ActivityGpxUploadReceipt> {
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
  },

  async download(path: string): Promise<Uint8Array> {
    return new Uint8Array(await getBytes(ref(storage, path)));
  },

  async exists(path: string): Promise<boolean> {
    try {
      await getMetadata(ref(storage, path));
      return true;
    } catch (error: any) {
      if (error?.code === "storage/object-not-found") return false;
      throw error;
    }
  },

  async delete(path: string): Promise<void> {
    await deleteObject(ref(storage, path));
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
