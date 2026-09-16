package com.autopartes.domain.usecase

import com.autopartes.domain.error.GarageError
import com.autopartes.domain.model.Vehicle
import com.autopartes.domain.repository.GarageRepository

/**
 * Establece el vehiculo activo (HU-03, RF-03 C1 / RF-05 C1).
 * Garantiza UNICO vehiiculo activo por usuario (filtro automatico del catalogo).
 */
class SetActiveVehicle(private val repository: GarageRepository) {

    suspend operator fun invoke(userId: String, vehicleId: String): Vehicle {
        val vehicles = repository.listByUser(userId)
        if (vehicles.none { it.id == vehicleId }) {
            throw GarageError.VehiculoNoEncontrado
        }
        return repository.setActiveVehicle(userId, vehicleId)
    }
}