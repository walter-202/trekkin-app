import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { TrekkinActivity } from '../../core/domain/types';
import { handleFirestoreError, OperationType } from './firestoreErrors';

const ACTIVITIES_COLLECTION = 'activities';

function cleanUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(updates).reduce<Record<string, unknown>>((acc, [key, val]) => {
    if (val !== undefined) acc[key] = val;
    return acc;
  }, {});
}

/**
 * HU-08 — Servicio Firestore para la colección `activities`.
 * Encapsula todas las operaciones con la colección activities/{activityId}
 * respetando las reglas de seguridad definidas en firestore.rules.
 */
export const activityService = {
  /**
   * Guarda o crea una actividad completa en Firestore.
   */
  async createActivity(activity: TrekkinActivity): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${activity.id}`;
    try {
      const docRef = doc(db, ACTIVITIES_COLLECTION, activity.id);
      await setDoc(docRef, activity);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  },

  /**
   * Actualiza campos específicos de una actividad existente.
   */
  async updateActivity(id: string, updates: Partial<TrekkinActivity>): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;
    try {
      const clean = cleanUpdates(updates as Record<string, unknown>);
      if (Object.keys(clean).length === 0) return;
      const docRef = doc(db, ACTIVITIES_COLLECTION, id);
      await updateDoc(docRef, clean);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  /**
   * Obtiene una actividad por su ID.
   */
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
   * Lista las actividades correspondientes a un usuario (privacidad estricta).
   * Se ordena en memoria por createdAt descendente para evitar índices compuestos.
   */
  async listUserActivities(userId: string): Promise<TrekkinActivity[]> {
    const collectionPath = ACTIVITIES_COLLECTION;
    try {
      const q = query(
        collection(db, collectionPath),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map((d) => d.data() as TrekkinActivity);
      return activities.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  },

  /**
   * Elimina una actividad por ID (dueño o admin según firestore.rules).
   */
  async deleteActivity(id: string): Promise<void> {
    const docPath = `${ACTIVITIES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, ACTIVITIES_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  },
};

