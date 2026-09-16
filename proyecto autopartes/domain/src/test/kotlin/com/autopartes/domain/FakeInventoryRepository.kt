package com.autopartes.domain

import com.autopartes.domain.model.CounterHit
import com.autopartes.domain.model.OemPart
import com.autopartes.domain.model.OemStockGroup
import com.autopartes.domain.model.PartVariant
import com.autopartes.domain.repository.InventoryRepository

/**
 * Repositorio de inventario fake en memoria (no usa Room) para HU-06 (RF-10) y
 * HU-07 (RF-11/RF-12). Copia los datos del [com.autopartes.data.local.CatalogSeed]
 * e [InventorySeed] para que los tests del dominio no dependan de la capa data:
 * un grupo bajo reorden (o-5) sirve de alerta de stock critico.
 */
class FakeInventoryRepository : InventoryRepository {

    private val hits = mutableListOf<CounterHit>()
    var seeded = false

    override suspend fun ensureSeeded() {
        if (seeded) return
        hits.addAll(demoHits)
        seeded = true
    }

    override suspend fun counterQuery(query: String): List<CounterHit> {
        val termino = query.trim().lowercase()
        return hits.filter {
            it.oemPart.nombreComun.lowercase().contains(termino) ||
                it.oemPart.codigoOem.lowercase().contains(termino)
        }
    }

    override suspend fun stockAgrupadoPorOem(): List<OemStockGroup> = demoGrupos

    fun clear() {
        hits.clear()
        seeded = false
    }

    private val demoHits = listOf(
        CounterHit(
            oemPart = OemPart("o-1", "04465-33490", "Pastillas de freno delanteras", "Frenos", 10),
            variantes = listOf(
                PartVariant("v-1", "o-1", "Bosch", "BP341", "Pastillas Bosch", 120.0),
                PartVariant("v-2", "o-1", "Akebono", "AK-04465", "Pastillas Akebono", 98.0)
            ),
            stockTotal = 14 + 9
        ),
        CounterHit(
            oemPart = OemPart("o-3", "23300-0N250", "Filtro de aire", "Filtros", 8),
            variantes = listOf(
                PartVariant("v-5", "o-3", "K&N", "33-2440", "Filtro K&N", 145.0),
                PartVariant("v-6", "o-3", "DENSO", "DN-23300", "Filtro Denso", 60.0)
            ),
            stockTotal = 22 + 12
        )
    )

    /**
     * Grupos OEM completos (espejo del seed): solo `o-5` está bajo su punto de reorden
     * (stock 4 <= reorder 6, RF-12 C1). Coherente con [demoHits].
     */
    private val demoGrupos = listOf(
        OemStockGroup(
            oemPart = OemPart("o-1", "04465-33490", "Pastillas de freno delanteras", "Frenos", 10),
            fabricantes = listOf("Akebono", "Bosch"),
            stockTotal = 23, // 14 + 9
            reorderPoint = 10,
            esCritico = false
        ),
        OemStockGroup(
            oemPart = OemPart("o-2", "90919-01250", "Bujía de encendido", "Motor", 20),
            fabricantes = listOf("DENSO", "NGK"),
            stockTotal = 40, // 22 + 18
            reorderPoint = 20,
            esCritico = false
        ),
        OemStockGroup(
            oemPart = OemPart("o-5", "16510-62J00", "Filtro de aire", "Filtros", 6),
            fabricantes = listOf("MANN"),
            stockTotal = 4,
            reorderPoint = 6,
            esCritico = true
        )
    )
}