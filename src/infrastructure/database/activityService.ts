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
import type { TrekkinActivity } from "../../core/domain/types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

/**
 * HU-06 — Servicio de actividades (colección `activities`).
 * Único archivo que consulta Firestore para el historial GPS del usuario.
 * Las reglas de la colección ya existen (dueño-only) en firestore.rules.
 */
const ACTIVITIES_COLLECTION = "activities";

export const activityService = {
  /** Crea (o reemplaza por id) una actividad del historial del usuario. */
  async createActivity(activity: TrekkinActivity): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${activity.id}`;
    try {
      const docRef = doc(db, ACTIVITIES_COLLECTION, activity.id);
      await setDoc(docRef, activity);
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
      return snapshot.docs.map((d) => d.data() as TrekkinActivity);
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
      return snapshot.data() as TrekkinActivity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  },
};
