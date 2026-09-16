package com.autopartes.data.repository

import com.autopartes.data.local.CatalogDao
import com.autopartes.data.local.CatalogSeed
import com.autopartes.data.local.InventoryDao
import com.autopartes.data.local.entity.toDomain
import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.model.ProductDetail
import com.autopartes.domain.repository.CatalogRepository
import javax.inject.Inject

/**
 * Implementa [CatalogRepository] sobre Room. Busca nombre común + código OEM y deduplica
 * por id (RF-06). [getDetail] entrega la ficha factual (RF-08 C2): variantes con precio
 * y stock acumulado del grupo via `inventory`; el gate de sesión lo aplica
 * `GetProductDetail` en dominio, no aquí.
 */
class CatalogRepositoryImpl @Inject constructor(
    private val dao: CatalogDao,
    private val inventoryDao: InventoryDao
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
            val entity = porCodigo.firstOrNull { it.id == id }
                ?: porNombre.firstOrNull { it.id == id }
                ?: return@mapNotNull null
            val varianteMuestra = variantes[id]?.minByOrNull { it.precioUnitario }
            CatalogSummary(
                oemPart = entity.toDomain(),
                marcaMuestra = varianteMuestra?.marcaFabricante,
                precioMuestra = varianteMuestra?.precioUnitario
            )
        }
    }

    override suspend fun getDetail(oemId: String): ProductDetail? {
        val entity = dao.findOemById(oemId) ?: return null
        val variantes = dao.findVariantsByOemIds(listOf(oemId))

        val stockPorVariante = inventoryDao
            .stockByVariantIds(variantes.map { it.id })
            .associateBy { it.partVariantId }

        return ProductDetail(
            oemPart = entity.toDomain(),
            descripcion = descripcionDe(entity.toDomain()),
            variantes = variantes.map { it.toDomain() }.sortedBy { it.precioUnitario },
            stockTotal = variantes.sumOf { stockPorVariante[it.id]?.total ?: 0L }.toInt()
        )
    }

    /** Descripción derivada de datos ya existentes (sin columnas nuevas; RF-08 C2). */
    private fun descripcionDe(part: com.autopartes.domain.model.OemPart): String {
        val categoria = part.categoria?.let { " de la categoría «$it»" } ?: ""
        return "Repuesto «${part.nombreComun}»$categoria, identificado con el código de " +
            "fábrica ${part.codigoOem}. A continuación las equivalencias por fabricante."
    }
}