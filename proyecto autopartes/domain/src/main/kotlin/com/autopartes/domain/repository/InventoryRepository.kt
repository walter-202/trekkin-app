package com.autopartes.domain.repository

import com.autopartes.domain.model.CounterHit

/**
 * Puerto del mostrador vendedor (HU-06, RF-10). Consulta rápida por teclado:
 * devuelve el grupo OEM con sus variantes y el stock total acumulado.
 */
interface InventoryRepository {

    /** Carga el stock demo si la tabla `inventory` está vacía (espejo de CatalogSeed). */
    suspend fun ensureSeeded()

    /** Consulta rápida por nombre común o código OEM (RF-10 C2). */
    suspend fun counterQuery(query: String): List<CounterHit>
}