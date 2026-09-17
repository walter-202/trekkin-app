package com.autopartes.domain.model

/**
 * Borrador de Orden de Compra sugerido automáticamente por el sistema (HU-08, RF-13).
 * Nace siempre en estado `borrador` ([ESTADO_BORRADOR], RF-13 C3) para que el admin
 * pueda editarlo antes de confirmarlo. [lineas] contienen solo los repuestos bajo su
 * punto de reorden (RF-13 C2).
 */
data class PurchaseOrderDraft(
    val id: String,
    val supplierId: String,
    val supplierNombre: String,
    val createdBy: String,
    val estado: String,
    val fecha: Long,
    val lineas: List<PurchaseOrderLine>
) {

    companion object {
        /** Estado editable inicial de toda OC sugerida (RF-13 C3). */
        const val ESTADO_BORRADOR = "borrador"
    }
}