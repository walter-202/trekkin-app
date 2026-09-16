package com.autopartes.domain.model

/**
 * Resultado de la Consulta Rápida del mostrador vendedor (RF-10 C3).
 * Muestra el grupo OEM con sus variantes (precio por variante) y el
 * stock total del grupo: `SUM(inventory.cantidad)` de todas sus variantes.
 */
data class CounterHit(
    val oemPart: OemPart,
    val variantes: List<PartVariant>,
    val stockTotal: Int
)