package com.autopartes.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.autopartes.data.local.entity.SupplierEntity

/** Consulta de proveedores (HU-08, RF-13 C1). El seed solo aplica si la tabla está vacía. */
@Dao
interface SupplierDao {

    @Query("SELECT * FROM suppliers")
    suspend fun getAll(): List<SupplierEntity>

    @Query("SELECT COUNT(*) FROM suppliers")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(suppliers: List<SupplierEntity>)
}