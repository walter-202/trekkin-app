package com.autopartes.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.autopartes.domain.model.Vehicle

/**
 * Vehículo del usuario en Room (mirror de `vehicles` en docs/DATABASE.md).
 * SIN número de placa (exclusión V1.0, RF-02). Un único activo por usuario se
 * garantiza a nivel de repositorio (transacción), no con un único índice parcial.
 */
@Entity(
    tableName = "vehicles",
    indices = [
        Index(value = ["userId"]),
        Index(value = ["userId", "esActivo"])
    ]
)
data class VehicleEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val marca: String,
    val modelo: String,
    val anio: Int,
    val cilindradaMotor: String,
    val esActivo: Boolean,
    val createdAt: Long
)

fun VehicleEntity.toDomain(): Vehicle = Vehicle(
    id = id,
    userId = userId,
    marca = marca,
    modelo = modelo,
    anio = anio,
    cilindradaMotor = cilindradaMotor,
    esActivo = esActivo
)

fun Vehicle.toEntity(createdAt: Long): VehicleEntity = VehicleEntity(
    id = id,
    userId = userId,
    marca = marca,
    modelo = modelo,
    anio = anio,
    cilindradaMotor = cilindradaMotor,
    esActivo = esActivo,
    createdAt = createdAt
)