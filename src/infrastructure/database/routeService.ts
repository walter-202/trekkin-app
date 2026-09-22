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
  limit,
  startAfter,
  documentId,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { RouteModel } from "../../core/domain/types";
import type { RoutePublicationArtifacts } from "../../core/domain/types";
import { ValidateRoutePublicationUseCase } from "../../core/application/route/PublishRoute.usecase";
import { parseOptionalRoutePreview } from "../../core/domain/routeCatalog";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

const ROUTES_COLLECTION = "routes";
function cleanUpdates(
  updates: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(updates).reduce<Record<string, unknown>>(
    (acc, [key, val]) => {
      if (val !== undefined) acc[key] = val;
      return acc;
    },
    {},
  );
}

function toPublishedCatalogRoute(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): RouteModel {
  const data = snapshot.data();
  const preview = parseOptionalRoutePreview(data.preview);

  return {
    ...(data as RouteModel),
    id: snapshot.id,
    preview,
    // Catalog results discard legacy full geometry and detail-only checkpoints.
    waypoints: [],
    checkpoints: [],
    photos: Array.isArray(data.photos) ? (data.photos as string[]) : [],
  };
}

function assertPageSize(pageSize: number): void {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("El tamaño de página debe ser un entero entre 1 y 100.");
  }
}

function publishedCatalogConstraints(
  pageSize: number,
  lastDoc?: unknown,
) {
  return [
    where("status", "==", "published"),
    orderBy("createdAt", "desc"),
    orderBy(documentId(), "asc"),
    ...(lastDoc
      ? [startAfter(lastDoc as QueryDocumentSnapshot<DocumentData>)]
      : []),
    limit(pageSize),
  ];
}

/**
 * HU-03 + HU-07 — Servicio Firestore `routes` (único lugar con
 * `firebase/firestore` para este módulo).
 * HU-03: catálogo público (`where status == 'published'` + get por id).
 * Filtros de texto/dificultad/distancia se aplican en cliente (usecase)
 * para evitar índices compuestos.
 * HU-07: borradores de planificación (`status == 'draft'`, solo creador).
 */
export const routeService = {
  // ---------- HU-03: catálogo público/aprobado ----------

  /**
   * Lista rutas publicadas aplicando un límite por defecto para proteger la cuota de Firestore.
   */
  async listPublishedRoutes(limitCount: number = 20): Promise<RouteModel[]> {
    try {
      assertPageSize(limitCount);
      const q = query(
        collection(db, ROUTES_COLLECTION),
        ...publishedCatalogConstraints(limitCount),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(toPublishedCatalogRoute);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, ROUTES_COLLECTION);
    }
  },

  /**
   * Paginación por cursor para explorar el catálogo en bloques sin saturar la red ni memoria.
   */
  async listPublishedRoutesPaginated(
    pageSize: number = 20,
    lastDoc?: unknown,
  ): Promise<{ routes: RouteModel[]; lastVisible: unknown | null; hasMore: boolean }> {
    try {
      assertPageSize(pageSize);
      const q = query(
        collection(db, ROUTES_COLLECTION),
        ...publishedCatalogConstraints(pageSize + 1, lastDoc),
      );
      const snapshot = await getDocs(q);
      const hasMore = snapshot.docs.length > pageSize;
      const pageDocs = snapshot.docs.slice(0, pageSize);
      const lastVisible = pageDocs.at(-1) ?? null;
      return {
        routes: pageDocs.map(toPublishedCatalogRoute),
        lastVisible,
        hasMore,
      };
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

  // ---------- HU-07: borradores de planificación ----------

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
        where("creatorId", "==", uid),
        where("status", "==", "draft"),
        orderBy("updatedAt", "desc"),
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
   * Admin-only publication boundary. Only Firestore metadata is written;
   * GPX/PMTiles bytes must already exist at their validated Storage paths.
   */
  async publishRoute(
    id: string,
    artifacts: RoutePublicationArtifacts,
  ): Promise<void> {
    const validated = ValidateRoutePublicationUseCase(id, artifacts);
    const docPath = `${ROUTES_COLLECTION}/${id}`;
    try {
      await updateDoc(doc(db, ROUTES_COLLECTION, id), {
        status: "published",
        artifacts: validated,
        updatedAt: Date.now(),
      });
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
