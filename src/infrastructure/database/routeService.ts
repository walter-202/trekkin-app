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
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { RouteModel } from '../../core/domain/types';
import { handleFirestoreError, OperationType } from './firestoreErrors';

/**
 * HU-07 — Servicio de rutas (colección `routes`).
 * Único archivo que consulta Firestore para los borradores de planificación.
 * Un borrador es un RouteModel con status 'draft' (reglas ya permitidas por el creador).
 */
const ROUTES_COLLECTION = 'routes';

function cleanUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(updates).reduce<Record<string, unknown>>((acc, [key, val]) => {
    if (val !== undefined) acc[key] = val;
    return acc;
  }, {});
}

export const routeService = {
  /**
   * Crea (o reemplaza por id) un borrador de ruta en Firestore.
   */
  async createDraft(route: RouteModel): Promise<void> {
    const docPath = `${ROUTES_COLLECTION}/${route.id}`;
    try {
      const docRef = doc(db, ROUTES_COLLECTION, route.id);
      await setDoc(docRef, route);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  },

  /**
   * Obtiene una ruta por su id.
   */
  async getRoute(id: string): Promise<RouteModel | null> {
    const docPath = `${ROUTES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, ROUTES_COLLECTION, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      return snapshot.data() as RouteModel;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  },

  /**
   * Lista los borradores del usuario (status 'draft') más recientes primero.
   */
  async listUserDrafts(uid: string): Promise<RouteModel[]> {
    const collectionPath = ROUTES_COLLECTION;
    try {
      const q = query(
        collection(db, collectionPath),
        where('creatorId', '==', uid),
        where('status', '==', 'draft'),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as RouteModel);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  },

  /**
   * Actualiza campos de un borrador existente (solo creador, según reglas).
   */
  async updateRoute(id: string, updates: Partial<RouteModel>): Promise<void> {
    const docPath = `${ROUTES_COLLECTION}/${id}`;
    try {
      const clean = cleanUpdates(updates as Record<string, unknown>);
      if (Object.keys(clean).length === 0) return;
      const docRef = doc(db, ROUTES_COLLECTION, id);
      await updateDoc(docRef, clean);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  /**
   * Elimina un borrador (solo creador mientras sea draft).
   */
  async deleteDraft(id: string): Promise<void> {
    const docPath = `${ROUTES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, ROUTES_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  },
};