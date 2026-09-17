package com.autopartes.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.autopartes.data.local.entity.PurchaseOrderDraftEntity
import com.autopartes.data.local.entity.PurchaseOrderLineEntity

/** Línea del borrador con el JOIN a `oem_parts` para el código y nombre común (RF-13 C1). */
data class LineaConOem(
    val id: String,
    val poDraftId: String,
    val oemPartId: String,
    val stockActual: Int,
    val cantidadRequerida: Int,
    val codigoOem: String,
    val nombreComun: String
)

/**
 * Persistencia de los borradores de Orden de Compra (HU-08, RF-13).
 * El borrador y sus líneas se guardan en una única transacción ([guardarBorrador]),
 * espejo del patrón transaccional de [GarageDao].
 */
@Dao
interface OrderDao {

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertDraft(draft: PurchaseOrderDraftEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertLines(lineas: List<PurchaseOrderLineEntity>)

    @Query("SELECT * FROM purchase_order_drafts WHERE id = :id LIMIT 1")
    suspend fun getDraftById(id: String): PurchaseOrderDraftEntity?

    @Query(
        "SELECT lines.*, oem.codigoOem, oem.nombreComun FROM purchase_order_lines lines " +
            "JOIN oem_parts oem ON oem.id = lines.oemPartId " +
            "WHERE lines.poDraftId = :poDraftId ORDER BY oem.nombreComun COLLATE NOCASE"
    )
    suspend fun getLinesConOemByDraftId(poDraftId: String): List<LineaConOem>

    /** Persiste el borrador y sus líneas atómicamente (RF-13 C1/C3). */
    @Transaction
    suspend fun guardarBorrador(
        draft: PurchaseOrderDraftEntity,
        lineas: List<PurchaseOrderLineEntity>
    ) {
        insertDraft(draft)
        insertLines(lineas)
    }
}