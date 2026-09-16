package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index

/**
 * Compatibilidad vehículo<->repuesto en Room (mirror de `vehicle_compatibilities`
 * en docs/DATABASE.md). PK compuesta (vehicleId, oemPartId).
 */
@Entity(
    tableName = "vehicle_compatibilities",
    primaryKeys = ["vehicleId", "oemPartId"],
    foreignKeys = [
        ForeignKey(
            entity = VehicleEntity::class,
            parentColumns = ["id"],
            childColumns = ["vehicleId"],
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
        Index(value = ["vehicleId"]),
        Index(value = ["oemPartId"])
    ]
)
data class VehicleCompatibilityEntity(
    val vehicleId: String,
    val oemPartId: String
)