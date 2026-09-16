package com.autopartes.domain.usecase

import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.repository.CompatibilityRepository
import com.autopartes.domain.repository.GarageRepository
import com.autopartes.domain.repository.SessionManager

/**
 * Busqueda de catalogo acotada por el vehiculo activo del usuario (HU-03, RF-05 C2).
 * Si no hay sesion, no hay vehiculo activo o el vehiculo no tiene compatibilidades,
 * la busqueda NO se acota (regla de seguridad del scaffold).
 */
class SearchCatalogForActiveVehicle(
    private val searchCatalog: SearchCatalog,
    private val sessionManager: SessionManager,
    private val garageRepository: GarageRepository,
    private val compatibilityRepository: CompatibilityRepository
) {

    suspend operator fun invoke(query: String): List<CatalogSummary> {
        val session = sessionManager.currentSession()
        val activeVehicle = session?.let { garageRepository.getActiveVehicle(it.user.id) }
        val compatibleIds = activeVehicle?.let { compatibilityRepository.compatibleOemIdsFor(it.id) }

        return if (compatibleIds.isNullOrEmpty()) {
            searchCatalog(query)
        } else {
            searchCatalog(query, compatibleIds)
        }
    }
}