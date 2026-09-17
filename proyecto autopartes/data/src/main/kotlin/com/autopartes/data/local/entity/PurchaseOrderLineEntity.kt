package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.autopartes.domain.model.PurchaseOrderLine

/**
 * Línea de un borrador de OC en Room (mirror de `purchase_order_lines` en
 * docs/DATABASE.md, RF-13). Guarda el snapshot del stock agrupado y la cantidad
 * requerida (RF-13 C2: `reorder_point - stock_actual`, mín. 0). El código OEM y el
 * nombre común NO se duplican: se leen por JOIN con `oem_parts`.
 */
@Entity(
    tableName = "purchase_order_lines",
    foreignKeys = [
        ForeignKey(
            entity = PurchaseOrderDraftEntity::class,
            parentColumns = ["id"],
            childColumns = ["poDraftId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = OemPartEntity::class,
            parentColumns = ["id"],
            childColumns = ["oemPartId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["poDraftId"]),
        Index(value = ["oemPartId"])
    ]
)
data class PurchaseOrderLineEntity(
    @PrimaryKey val id: String,
    val poDraftId: String,
    val oemPartId: String,
    val stockActual: Int,
    val cantidadRequerida: Int
)

/** Mapea la línea a dominio; [codigoOem]/[nombreComun] llegan del JOIN con `oem_parts`. */
fun PurchaseOrderLineEntity.toDomain(
    codigoOem: String,
    nombreComun: String
): PurchaseOrderLine = PurchaseOrderLine(
    id = id,
    oemPartId = oemPartId,
    codigoOem = codigoOem,
    nombreComun = nombreComun,
    stockActual = stockActual,
    cantidadRequerida = cantidadRequerida
)