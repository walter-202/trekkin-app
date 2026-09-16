package com.autopartes.domain.usecase

import com.autopartes.domain.model.Vehicle
import com.autopartes.domain.repository.GarageRepository

/** Devuelve el vehiculo activo del usuario, si existe (RF-03 C1 / RF-05 C1). */
class GetActiveVehicle(private val repository: GarageRepository) {

    suspend operator fun invoke(userId: String): Vehicle? =
        repository.getActiveVehicle(userId)
}