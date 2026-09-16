package com.autopartes.data.repository

import com.autopartes.data.local.CatalogDao
import com.autopartes.data.local.InventoryDao
import com.autopartes.data.local.InventorySeed
import com.autopartes.data.local.entity.toDomain
import com.autopartes.domain.model.CounterHit
import com.autopartes.domain.model.OemStockGroup
import com.autopartes.domain.repository.InventoryRepository
import javax.inject.Inject

/**
 * Implementa [InventoryRepository] sobre Room (HU-06/HU-07, RF-10/RF-11/RF-12).
 * Comparte consultas de [CatalogDao] (variantes por OEM) e [InventoryDao]
 * (stock por variante): el stock del grupo OEM = Σ de la cantidad de sus variantes.
 */
class InventoryRepositoryImpl @Inject constructor(
    private val catalogDao: CatalogDao,
    private val inventoryDao: InventoryDao
) : InventoryRepository {

    override suspend fun ensureSeeded() {
        if (inventoryDao.count() == 0) {
            inventoryDao.insertAll(InventorySeed.rows)
        }
    }

    override suspend fun counterQuery(query: String): List<CounterHit> {
        val porCodigo = catalogDao.searchByCodigoOem(query)
        val porNombre = catalogDao.searchByNombreComun(query)

        val oemIds = LinkedHashSet<String>()
        porCodigo.forEach { oemIds.add(it.id) }
        porNombre.forEach { oemIds.add(it.id) }

        if (oemIds.isEmpty()) return emptyList()

        val variantes = catalogDao.findVariantsByOemIds(oemIds.toList()).groupBy { it.oemPartId }

        val stockPorVariante = inventoryDao
            .stockByVariantIds(variantes.values.flatten().map { it.id })
            .associateBy { it.partVariantId }

        return oemIds.mapNotNull { id ->
            val entity = porCodigo.firstOrNull { it.id == id }
                ?: porNombre.firstOrNull { it.id == id }
                ?: return@mapNotNull null
            val variantesDelGrupo = variantes[id].orEmpty()
            CounterHit(
                oemPart = entity.toDomain(),
                variantes = variantesDelGrupo
                    .map { it.toDomain() }
                    .sortedBy { it.precioUnitario },
                stockTotal = variantesDelGrupo
                    .sumOf { stockPorVariante[it.id]?.total ?: 0L }
                    .toInt()
            )
        }
    }

    override suspend fun stockAgrupadoPorOem(): List<OemStockGroup> {
        val oems = catalogDao.getAllOemParts()
        if (oems.isEmpty()) return emptyList()

        val variantesPorOem = catalogDao
            .findVariantsByOemIds(oems.map { it.id })
            .groupBy { it.oemPartId }

        val stockPorVariante = inventoryDao
            .stockByVariantIds(variantesPorOem.values.flatten().map { it.id })
            .associateBy { it.partVariantId }

        return oems.map { oem ->
            val variantes = variantesPorOem[oem.id].orEmpty()
            val stockTotal = variantes
                .sumOf { stockPorVariante[it.id]?.total ?: 0L }
                .toInt()
            OemStockGroup(
                oemPart = oem.toDomain(),
                fabricantes = variantes.map { it.marcaFabricante }.distinct().sorted(),
                stockTotal = stockTotal,
                reorderPoint = oem.reorderPoint,
                esCritico = stockTotal <= oem.reorderPoint
            )
        }
    }
}