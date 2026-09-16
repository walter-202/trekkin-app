package com.autopartes.data.local

import com.autopartes.data.local.entity.VehicleCompatibilityEntity

/**
 * Seed demo de compatibilidades vehiculo<->repuesto (HU-03, RF-05 C2).
 * Mapea marcas del catalogo demo (Toyota/Suzuki/Nissan) a oem_parts de ejemplo.
 * En produccion estas filas vienen de la API; si el vehiculo no es de una marca
 * conocida, NO se registran compatibilidades y el catalogo no se acota.
 */
object GarageSeed {

    private val oemIdsByMarca: Map<String, List<String>> = mapOf(
        "toyota" to listOf("o-1", "o-2", "o-3"),
        "suzuki" to listOf("o-4", "o-5"),
        "nissan" to listOf("o-2", "o-6")
    )

    fun compatibilitiesFor(vehicleId: String, marca: String): List<VehicleCompatibilityEntity> {
        val marcaNormalizada = marca.trim().lowercase()
        return oemIdsByMarca[marcaNormalizada]
            ?.map { oemPartId -> VehicleCompatibilityEntity(vehicleId, oemPartId) }
            ?: emptyList()
    }
}