package com.autopartes.data.local

import com.autopartes.data.local.entity.InventoryEntity

/**
 * Stock demo del mostrador vendedor (HU-06, RF-10 C3) y futuro panel de críticos (HU-07).
 * Solo se inserta si la tabla `inventory` está vacía. Cada fila pertenece a una variante
 * del [CatalogSeed]; el stock del grupo OEM = Σ de la cantidad de sus variantes.
 */
object InventorySeed {

    val rows: List<InventoryEntity> = listOf(
        InventoryEntity("i-1", "v-1", cantidad = 14, lote = "L-2024-01"),
        InventoryEntity("i-2", "v-2", cantidad = 9, lote = "L-2024-01"),
        InventoryEntity("i-3", "v-3", cantidad = 22, lote = "L-2024-02"),
        InventoryEntity("i-4", "v-4", cantidad = 18, lote = "L-2024-02"),
        InventoryEntity("i-5", "v-5", cantidad = 6, lote = "L-2024-03"),
        InventoryEntity("i-6", "v-6", cantidad = 12, lote = "L-2024-03"),
        InventoryEntity("i-7", "v-7", cantidad = 16, lote = "L-2024-01"),
        InventoryEntity("i-8", "v-8", cantidad = 10, lote = "L-2024-02"),
        InventoryEntity("i-9", "v-9", cantidad = 4, lote = "L-2024-04"),
        InventoryEntity("i-10", "v-10", cantidad = 11, lote = "L-2024-02")
    ).mapIndexed { index, row -> row.copy(id = "i-${index + 1}") }
}