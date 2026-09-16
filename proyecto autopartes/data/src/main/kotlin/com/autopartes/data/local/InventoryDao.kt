package com.autopartes.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.autopartes.data.local.entity.InventoryEntity

/** Consulta del stock por variante del mostrador (HU-06, RF-10 C3). */
data class StockRow(val partVariantId: String, val total: Long)

@Dao
interface InventoryDao {

    /** Stock total de cada variante del grupo (RF-10: `stock(Σ inventory)` por variante). */
    @Query(
        "SELECT partVariantId, SUM(cantidad) AS total FROM inventory " +
            "WHERE partVariantId IN (:variantIds) GROUP BY partVariantId"
    )
    suspend fun stockByVariantIds(variantIds: List<String>): List<StockRow>

    @Query("SELECT COUNT(*) FROM inventory")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(rows: List<InventoryEntity>)
}