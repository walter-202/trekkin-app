package com.autopartes.domain.repository

import com.autopartes.domain.model.PurchaseOrderDraft

/**
 * Puerto de la Sugerencia de Orden de Compra (HU-08, RF-13).
 * La generación del borrador completo (calcular líneas desde el inventario agrupado,
 * elegir proveedor y persistir en estado `borrador`) vive detrás de este puerto;
 * el agrupamiento por OEM se reutiliza de [InventoryRepository].
 */
interface PurchaseOrderRepository {

    /** Genera y persiste un borrador de OC solo con los grupos bajo reorden (RF-13 C1/C2/C3). */
    suspend fun generarBorradorDeOC(): PurchaseOrderDraft

    /** Recupera un borrador persistido con sus líneas y proveedor, o null si no existe. */
    suspend fun obtenerBorrador(id: String): PurchaseOrderDraft?
}