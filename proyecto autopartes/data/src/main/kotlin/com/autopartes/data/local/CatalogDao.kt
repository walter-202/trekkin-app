package com.autopartes.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.autopartes.data.local.entity.OemPartEntity
import com.autopartes.data.local.entity.PartVariantEntity

@Dao
interface CatalogDao {

    @Query("SELECT COUNT(*) FROM oem_parts")
    suspend fun countOemParts(): Int

    @Query("SELECT * FROM oem_parts WHERE codigo_oem LIKE '%' || :query || '%' COLLATE NOCASE")
    suspend fun searchByCodigoOem(query: String): List<OemPartEntity>

    @Query("SELECT * FROM oem_parts WHERE nombre_comun LIKE '%' || :query || '%' COLLATE NOCASE")
    suspend fun searchByNombreComun(query: String): List<OemPartEntity>

    @Query("SELECT * FROM part_variants WHERE oemPartId IN (:oemIds)")
    suspend fun findVariantsByOemIds(oemIds: List<String>): List<PartVariantEntity>

    @Query("SELECT * FROM oem_parts WHERE id = :id LIMIT 1")
    suspend fun findOemById(id: String): OemPartEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertOemParts(parts: List<OemPartEntity>)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertVariants(variants: List<PartVariantEntity>)
}