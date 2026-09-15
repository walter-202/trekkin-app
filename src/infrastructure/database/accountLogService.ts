import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { AccountLogEntry } from "../../core/domain/types";
import { AccountLogSchema } from "../../core/domain/userManagement.schemas";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

const LOGS_COLLECTION = "accountLogs";

/**
 * HU-10 T7 — Bitácora de gestión de cuentas.
 * Única capa que importa `firebase/firestore` para el historial
 * de bloqueos, desbloqueos y cambios de rol. Solo escribe el admin.
 */
export const accountLogService = {
  /**
   * Registra una operación de administración de cuenta (bloqueo/desbloqueo/rol).
   */
  async createLog(entry: AccountLogEntry): Promise<void> {
    const parsed = AccountLogSchema.parse(entry);
    try {
      const docRef = doc(db, LOGS_COLLECTION, parsed.id);
      await setDoc(docRef, parsed);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, LOGS_COLLECTION);
    }
  },
};
