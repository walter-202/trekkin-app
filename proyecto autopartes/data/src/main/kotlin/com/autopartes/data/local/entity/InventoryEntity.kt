package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Stock disponible de una variante (mirror de `inventory` en docs/DATABASE.md, RF-10/RF-11).
 * El stock de un grupo OEM = Σ cantidad de todas sus variantes.
 */
@Entity(
    tableName = "inventory",
    foreignKeys = [
        ForeignKey(
            entity = PartVariantEntity::class,
            parentColumns = ["id"],
            childColumns = ["partVariantId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["partVariantId"])
    ]
)
data class InventoryEntity(
    @PrimaryKey val id: String,
    val partVariantId: String,
    val cantidad: Int,
    val lote: String? = null,
    val fechaIngreso: Long
)