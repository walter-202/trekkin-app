package com.autopartes.domain.repository

import com.autopartes.domain.model.CounterHit
import com.autopartes.domain.model.OemStockGroup

/**
 * Puerto de inventario (HU-06/HU-07). Mostrador vendedor (RF-10) y agrupacion por
 * codigo OEM con punto de reorden y alertas de stock critico (RF-11/RF-12, rol admin).
 */
interface InventoryRepository {

    /** Carga el stock demo si la tabla `inventory` está vacía (espejo de CatalogSeed). */
    suspend fun ensureSeeded()

    /** Consulta rápida por nombre común o código OEM (RF-10 C2). */
    suspend fun counterQuery(query: String): List<CounterHit>

    /** Stock de cada grupo OEM (Σ de sus variantes) + punto de reorden (HU-07, RF-11/RF-12). */
    suspend fun stockAgrupadoPorOem(): List<OemStockGroup>
}