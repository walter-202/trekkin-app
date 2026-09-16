package com.autopartes.domain

import com.autopartes.domain.model.CounterHit
import com.autopartes.domain.model.OemPart
import com.autopartes.domain.model.PartVariant
import com.autopartes.domain.repository.InventoryRepository

/**
 * Repositorio de inventario fake en memoria (no usa Room) para HU-06 (RF-10).
 * Copia los datos del [com.autopartes.data.local.CatalogSeed] para que los tests
 * del dominio no dependan de la capa data.
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
}