import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type {
  ActivityGpxMetadata,
  TrekkinActivity,
} from "../../core/domain/types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";
import { stripUndefined } from "./sanitizeDoc";

/**
 * HU-06 — Servicio de actividades (colección `activities`).
 * Único archivo que consulta Firestore para el historial GPS del usuario.
 * Las reglas de la colección ya existen (dueño-only) en firestore.rules.
 */
const ACTIVITIES_COLLECTION = "activities";

function toCloudActivity(activity: TrekkinActivity): Record<string, unknown> {
  // GPS points remain in SQLite/AsyncStorage. Firestore contains only the
  // activity summary plus GPX Storage metadata. Nested `undefined` (e.g.
  // gpx.sha256 from a local-cache upload receipt) is stripped so setDoc never
  // throws "Unsupported field value: undefined".
  const { recordedPoints: _recordedPoints, ...metadata } = activity;
  return stripUndefined(metadata) as Record<string, unknown>;
}

export const activityService = {
  /** Crea (o reemplaza por id) una actividad del historial del usuario. */
  async createActivity(activity: TrekkinActivity): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${activity.id}`;
    try {
      const docRef = doc(db, ACTIVITIES_COLLECTION, activity.id);
      await setDoc(docRef, toCloudActivity(activity));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  },

  /** Lista las actividades del usuario (dueño). Sin orderBy para no exigir índice. */
  async listUserActivities(uid: string): Promise<TrekkinActivity[]> {
    const collectionPath = ACTIVITIES_COLLECTION;
    try {
      const q = query(
        collection(db, collectionPath),
        where("userId", "==", uid),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (d) =>
          ({
            recordedPoints: [],
            ...d.data(),
          }) as unknown as TrekkinActivity,
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  },

  /** Obtiene una actividad del historial por su id. */
  async getActivity(id: string): Promise<TrekkinActivity | null> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, ACTIVITIES_COLLECTION, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      return {
        recordedPoints: [],
        ...snapshot.data(),
      } as unknown as TrekkinActivity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  },

  /**
   * Actualiza campos específicos de una actividad existente.
   */
  async updateActivity(
    id: string,
    updates: Partial<TrekkinActivity>,
  ): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;
    try {
      const clean = stripUndefined(
        Object.entries(updates).reduce<Record<string, unknown>>(
          (acc, [key, value]) => {
            if (key !== "recordedPoints" && value !== undefined)
              acc[key] = value;
            return acc;
          },
          {},
        ),
      ) as Record<string, unknown>;
      if (Object.keys(clean).length === 0) return;
      const docRef = doc(db, ACTIVITIES_COLLECTION, id);
      await setDoc(docRef, clean, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  async updateActivityGpxMetadata(
    id: string,
    metadata: ActivityGpxMetadata,
  ): Promise<void> {
    await this.updateActivity(id, { gpx: metadata });
  },

  /**
   * Elimina una actividad por ID.
   */
  async deleteActivity(id: string): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, ACTIVITIES_COLLECTION, id);
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  },
};
