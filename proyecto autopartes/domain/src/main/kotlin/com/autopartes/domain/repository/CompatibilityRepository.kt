package com.autopartes.domain.repository

/**
 * Puerto de compatibilidad vehiculo<->repuesto (HU-03, RF-05 C2).
 * Devuelve los ids de oem_parts compatibles con un vehiculo dado.
 */
interface CompatibilityRepository {

    suspend fun compatibleOemIdsFor(vehicleId: String): Set<String>
}