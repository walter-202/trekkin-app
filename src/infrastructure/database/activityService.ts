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
import type { TrekkinActivity, Coordinates } from "../../core/domain/types";
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

  /**
   * Guarda los puntos de una actividad en chunks de 500 en la subcolección points/{chunkIndex}
   * para no superar el límite de 1 MB de Firestore en grabaciones largas (BK-030).
   */
  async saveActivityPointsChunks(
    activityId: string,
    points: Coordinates[],
    chunkSize: number = 500,
  ): Promise<number> {
    const totalChunks = Math.ceil(points.length / chunkSize);
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunkSlice = points.slice(i * chunkSize, (i + 1) * chunkSize);
        const chunkRef = doc(
          db,
          `${ACTIVITIES_COLLECTION}/${activityId}/points`,
          `chunk_${i}`,
        );
        await setDoc(chunkRef, {
          chunkIndex: i,
          points: chunkSlice,
          count: chunkSlice.length,
          updatedAt: Date.now(),
        });
      }
      return totalChunks;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${ACTIVITIES_COLLECTION}/${activityId}/points`,
      );
    }
  },

  /**
   * Recupera todos los chunks de puntos de una actividad en orden.
   */
  async getActivityPointsChunks(activityId: string): Promise<Coordinates[]> {
    const pointsCollectionPath = `${ACTIVITIES_COLLECTION}/${activityId}/points`;
    try {
      const snapshot = await getDocs(collection(db, pointsCollectionPath));
      if (snapshot.empty) return [];

      const chunks = snapshot.docs
        .map((d) => d.data() as { chunkIndex: number; points: Coordinates[] })
        .sort((a, b) => a.chunkIndex - b.chunkIndex);

      return chunks.flatMap((c) => c.points);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, pointsCollectionPath);
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
      const clean = Object.entries(updates).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
          if (value !== undefined) acc[key] = value;
          return acc;
        },
        {},
      );
      if (Object.keys(clean).length === 0) return;
      const docRef = doc(db, ACTIVITIES_COLLECTION, id);
      await setDoc(docRef, clean, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
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
