import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { TrekkinActivity } from "../../core/domain/types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

const ACTIVITIES_COLLECTION = "activities";

function cleanUpdates(
  updates: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(updates).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );
}

export const activityService = {
  /** Crea o reemplaza una actividad por su ID. */
  async createActivity(activity: TrekkinActivity): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${activity.id}`;

    try {
      const docRef = doc(
        db,
        ACTIVITIES_COLLECTION,
        activity.id,
      );

      await setDoc(docRef, activity);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        docPath,
      );
    }
  },

  /** Actualiza campos específicos de una actividad existente. */
  async updateActivity(
    id: string,
    updates: Partial<TrekkinActivity>,
  ): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;

    try {
      const clean = cleanUpdates(
        updates as Record<string, unknown>,
      );

      if (Object.keys(clean).length === 0) {
        return;
      }

      const docRef = doc(
        db,
        ACTIVITIES_COLLECTION,
        id,
      );

      await updateDoc(docRef, clean);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        docPath,
      );
    }
  },

  /** Obtiene una actividad por su ID. */
  async getActivity(
    id: string,
  ): Promise<TrekkinActivity | null> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;

    try {
      const docRef = doc(
        db,
        ACTIVITIES_COLLECTION,
        id,
      );

      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as TrekkinActivity;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.GET,
        docPath,
      );
    }
  },

  /** Lista las actividades pertenecientes a un usuario. */
  async listUserActivities(
    userId: string,
  ): Promise<TrekkinActivity[]> {
    const collectionPath = ACTIVITIES_COLLECTION;

    try {
      const q = query(
        collection(db, collectionPath),
        where("userId", "==", userId),
      );

      const snapshot = await getDocs(q);

      const activities = snapshot.docs.map(
        (d) => d.data() as TrekkinActivity,
      );

      return activities.sort(
        (a, b) => b.createdAt - a.createdAt,
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        collectionPath,
      );
    }
  },

  /** Elimina una actividad por ID. */
  async deleteActivity(id: string): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;

    try {
      const docRef = doc(
        db,
        ACTIVITIES_COLLECTION,
        id,
      );

      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        docPath,
      );
    }
  },
};