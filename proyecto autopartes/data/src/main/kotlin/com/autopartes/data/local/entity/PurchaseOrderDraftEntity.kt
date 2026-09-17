package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.autopartes.data.local.UserEntity
import com.autopartes.domain.model.PurchaseOrderDraft
import com.autopartes.domain.model.PurchaseOrderLine

/**
 * Borrador de Orden de Compra sugerido en Room (mirror de `purchase_order_drafts`
 * en docs/DATABASE.md, RF-13). Nace en estado `borrador` (RF-13 C3) y referencia al
 * proveedor sugerido y al admin que lo generó.
 */
@Entity(
    tableName = "purchase_order_drafts",
    foreignKeys = [
        ForeignKey(
            entity = SupplierEntity::class,
            parentColumns = ["id"],
            childColumns = ["supplierId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["createdBy"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["supplierId"]),
        Index(value = ["createdBy"])
    ]
)
data class PurchaseOrderDraftEntity(
    @PrimaryKey val id: String,
    val supplierId: String,
    val createdBy: String,
    val estado: String,
    val fecha: Long
)

/** Mapea el borrador a dominio con su proveedor y sus líneas (RF-13 C1/C3). */
fun PurchaseOrderDraftEntity.toDomain(
    supplierNombre: String,
    lineas: List<PurchaseOrderLine>
): PurchaseOrderDraft = PurchaseOrderDraft(
    id = id,
    supplierId = supplierId,
    supplierNombre = supplierNombre,
    createdBy = createdBy,
    estado = estado,
    fecha = fecha,
    lineas = lineas
)