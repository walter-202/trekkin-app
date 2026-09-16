package com.autopartes.data.repository

import com.autopartes.data.local.GarageDao
import com.autopartes.data.local.GarageSeed
import com.autopartes.data.local.entity.VehicleEntity
import com.autopartes.data.local.entity.toDomain
import com.autopartes.data.local.entity.toEntity
import com.autopartes.domain.error.GarageError
import com.autopartes.domain.model.Vehicle
import com.autopartes.domain.repository.GarageRepository
import java.util.UUID
import javax.inject.Inject

/**
 * Implementa [GarageRepository] sobre Room. Reglas del garaje (RF-02/RF-03):
 * - Crea el vehiculo y, si es el primero del usuario, queda activo (filtro default).
 * - "Un unico activo" se aplica en transaccion [GarageDao.setActiveTransaction].
 * - Registra compatibilidades demo por marca (GarageSeed, RF-05 C2).
 */
class GarageRepositoryImpl @Inject constructor(
    private val dao: GarageDao
) : GarageRepository {

    override suspend fun listByUser(userId: String): List<Vehicle> =
        dao.getVehiclesByUser(userId).map { it.toDomain() }

    override suspend fun createVehicle(
        userId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    ): Vehicle {
        val id = UUID.randomUUID().toString()
        val esPrimero = dao.countByUser(userId) == 0

        val entity = VehicleEntity(
            id = id,
            userId = userId,
            marca = marca.trim(),
            modelo = modelo.trim(),
            anio = anio,
            cilindradaMotor = cilindradaMotor.trim(),
            esActivo = esPrimero,
            createdAt = System.currentTimeMillis()
        )
        dao.insertVehicle(entity)
        dao.insertCompatibilities(GarageSeed.compatibilitiesFor(id, marca))

        return entity.toDomain()
    }

    override suspend fun updateVehicle(
        userId: String,
        vehicleId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    ): Vehicle {
        val actual = dao.getVehicle(userId, vehicleId)
            ?: throw GarageError.VehiculoNoEncontrado

        val updated = actual.copy(
            marca = marca.trim(),
            modelo = modelo.trim(),
            anio = anio,
            cilindradaMotor = cilindradaMotor.trim()
        )
        dao.updateFields(
            userId = userId,
            vehicleId = vehicleId,
            marca = updated.marca,
            modelo = updated.modelo,
            anio = updated.anio,
            cilindradaMotor = updated.cilindradaMotor
        )
        dao.deleteCompatibilities(vehicleId)
        dao.insertCompatibilities(GarageSeed.compatibilitiesFor(vehicleId, updated.marca))

        return updated.toDomain()
    }

    override suspend fun setActiveVehicle(userId: String, vehicleId: String): Vehicle {
        val objetivo = dao.getVehicle(userId, vehicleId)
            ?: throw GarageError.VehiculoNoEncontrado
        if (!objetivo.esActivo) {
            dao.setActiveTransaction(userId, vehicleId)
        }
        return objetivo.copy(esActivo = true).toDomain()
    }

    override suspend fun getActiveVehicle(userId: String): Vehicle? =
        dao.findActiveByUser(userId)?.toDomain()
}