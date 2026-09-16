package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.autopartes.domain.model.OemPart

/**
 * Repuesto OEM en Room (mirror de `oem_parts` en docs/DATABASE.md).
 * codigo_oem UNIQUE + indice en nombre_comun para busquedas < 2s (RNF-02).
 */
@Entity(
    tableName = "oem_parts",
    indices = [
        Index(value = ["codigoOem"], unique = true),
        Index(value = ["nombreComun"])
    ]
)
data class OemPartEntity(
    @PrimaryKey val id: String,
    val codigoOem: String,
    val nombreComun: String,
    val categoria: String?,
    val reorderPoint: Int
)

fun OemPartEntity.toDomain(): OemPart = OemPart(
    id = id,
    codigoOem = codigoOem,
    nombreComun = nombreComun,
    categoria = categoria,
    reorderPoint = reorderPoint
)

fun OemPart.toEntity(): OemPartEntity = OemPartEntity(
    id = id,
    codigoOem = codigoOem,
    nombreComun = nombreComun,
    categoria = categoria,
    reorderPoint = reorderPoint
)