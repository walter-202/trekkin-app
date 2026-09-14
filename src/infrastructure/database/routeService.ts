import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { RouteModel } from "../../core/domain/types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

const ROUTES_COLLECTION = "routes";

/**
 * HU-03 — Servicio Firestore `routes` (único lugar con `firebase/firestore`
 * para este módulo). Catálogo = `where status == 'published'`.
 * Filtros de texto/dificultad/distancia se aplican en cliente (usecase)
 * para evitar índices compuestos; aquí solo se expone el catálogo y el get.
 */
export const routeService = {
  async listPublishedRoutes(): Promise<RouteModel[]> {
    try {
      const q = query(
        collection(db, ROUTES_COLLECTION),
        where("status", "==", "published"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        ...(d.data() as RouteModel),
        id: d.id,
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, ROUTES_COLLECTION);
    }
  },

  async getRouteById(id: string): Promise<RouteModel | null> {
    const docPath = `${ROUTES_COLLECTION}/${id}`;
    try {
      const snapshot = await getDoc(doc(db, ROUTES_COLLECTION, id));
      if (!snapshot.exists()) return null;
      return { ...(snapshot.data() as RouteModel), id: snapshot.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  },
};
