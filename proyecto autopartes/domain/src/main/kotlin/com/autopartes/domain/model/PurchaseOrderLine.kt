package com.autopartes.domain.model

/**
 * Línea de un borrador de Orden de Compra (HU-08, RF-13).
 * [stockActual] es el snapshot del stock acumulado del grupo OEM y [cantidadRequerida]
 * la cantidad sugerida a reabastecer (RF-13 C2: `reorderPoint - stockActual`, mín. 0).
 */
data class PurchaseOrderLine(
    val id: String,
    val oemPartId: String,
    val codigoOem: String,
    val nombreComun: String,
    val stockActual: Int,
    val cantidadRequerida: Int
)