package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.autopartes.domain.model.PartVariant

/**
 * Variante (equivalente por fabricante) de un codigo OEM (mirror de `part_variants`).
 */
@Entity(
    tableName = "part_variants",
    foreignKeys = [
        ForeignKey(
            entity = OemPartEntity::class,
            parentColumns = ["id"],
            childColumns = ["oemPartId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["oemPartId"]),
        Index(value = ["marcaFabricante", "codigoFabricante"], unique = true)
    ]
)
data class PartVariantEntity(
    @PrimaryKey val id: String,
    val oemPartId: String,
    val marcaFabricante: String,
    val codigoFabricante: String,
    val nombreComercial: String,
    val precioUnitario: Double
)

fun PartVariantEntity.toDomain(): PartVariant = PartVariant(
    id = id,
    oemPartId = oemPartId,
    marcaFabricante = marcaFabricante,
    codigoFabricante = codigoFabricante,
    nombreComercial = nombreComercial,
    precioUnitario = precioUnitario
)

fun PartVariant.toEntity(): PartVariantEntity = PartVariantEntity(
    id = id,
    oemPartId = oemPartId,
    marcaFabricante = marcaFabricante,
    codigoFabricante = codigoFabricante,
    nombreComercial = nombreComercial,
    precioUnitario = precioUnitario
)