package com.autopartes.data.repository

import com.autopartes.data.local.CatalogDao
import com.autopartes.data.local.CatalogSeed
import com.autopartes.data.local.entity.toDomain
import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.repository.CatalogRepository
import javax.inject.Inject

/**
 * Implementa [CatalogRepository] sobre Room. Busca nombre común + código OEM y deduplica
 * por id (RF-06). Seed demo solo si la tabla está vacía.
 */
class CatalogRepositoryImpl @Inject constructor(
    private val dao: CatalogDao
) : CatalogRepository {

    override suspend fun ensureSeeded() {
        if (dao.countOemParts() == 0) {
            dao.insertOemParts(CatalogSeed.oemParts)
            dao.insertVariants(CatalogSeed.variants)
        }
    }

    override suspend fun search(query: String): List<CatalogSummary> {
        val porCodigo = dao.searchByCodigoOem(query)
        val porNombre = dao.searchByNombreComun(query)

        val oemIds = LinkedHashSet<String>()
        porCodigo.forEach { oemIds.add(it.id) }
        porNombre.forEach { oemIds.add(it.id) }

        if (oemIds.isEmpty()) return emptyList()

        val variantes = dao.findVariantsByOemIds(oemIds.toList()).groupBy { it.oemPartId }

        return oemIds.mapNotNull { id ->
            val entity = porCodigo.firstOrNull { it.id == id } ?: porNombre.firstOrNull { it.id == id }
                ?: return@mapNotNull null
            val varianteMuestra = variantes[id]?.minByOrNull { it.precioUnitario }
            CatalogSummary(
                oemPart = entity.toDomain(),
                marcaMuestra = varianteMuestra?.marcaFabricante,
                precioMuestra = varianteMuestra?.precioUnitario
            )
        }
    }
}