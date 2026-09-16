package com.autopartes.domain

import com.autopartes.domain.repository.CompatibilityRepository

/** Compatibilidades fake en memoria (HU-03, RF-05 C2). */
class FakeCompatibilityRepository : CompatibilityRepository {

    val compatibilidades = mutableMapOf<String, Set<String>>()

    fun agregar(vehicleId: String, oemIds: Set<String>) {
        compatibilidades[vehicleId] = oemIds
    }

    override suspend fun compatibleOemIdsFor(vehicleId: String): Set<String> =
        compatibilidades[vehicleId] ?: emptySet()
}