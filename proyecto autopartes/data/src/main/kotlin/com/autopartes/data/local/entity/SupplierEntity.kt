package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Proveedor de repuestos en Room (mirror de `suppliers` en docs/DATABASE.md, RF-13).
 * Se usa para sugerir el proveedor del borrador de OC (RF-13 C1). En producción la
 * fuente real es la API; aquí se siembra [com.autopartes.data.local.SupplierSeed].
 */
@Entity(tableName = "suppliers")
data class SupplierEntity(
    @PrimaryKey val id: String,
    val nombre: String,
    val telefono: String,
    val email: String
)