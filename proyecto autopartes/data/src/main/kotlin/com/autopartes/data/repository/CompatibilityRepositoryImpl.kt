package com.autopartes.data.repository

import com.autopartes.data.local.GarageDao
import com.autopartes.domain.repository.CompatibilityRepository
import javax.inject.Inject

/** Implementa [CompatibilityRepository] sobre Room (HU-03, RF-05 C2). */
class CompatibilityRepositoryImpl @Inject constructor(
    private val dao: GarageDao
) : CompatibilityRepository {

    override suspend fun compatibleOemIdsFor(vehicleId: String): Set<String> =
        dao.compatibleOemIds(vehicleId).toSet()
}