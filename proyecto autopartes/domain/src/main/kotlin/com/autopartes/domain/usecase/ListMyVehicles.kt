package com.autopartes.domain.usecase

import com.autopartes.domain.model.Vehicle
import com.autopartes.domain.repository.GarageRepository

/** Lista los vehiculos del usuario (HU-03, RF-02 C2). */
class ListMyVehicles(private val repository: GarageRepository) {

    suspend operator fun invoke(userId: String): List<Vehicle> =
        repository.listByUser(userId)
}