package com.autopartes.domain.model

/**
 * Stock agrupado por codigo OEM (HU-07, RF-11/RF-12).
 * [stockTotal] = sumatoria del stock de todas las variantes equivalentes del grupo
 * ([PartVariant] → `inventory`); [fabricantes] son las marcas unicas presentes.
 * [esCritico] se cumple cuando el stock acumulado ya igualo o bajo el punto de reorden
 * (`stockTotal <= reorderPoint`, RF-12 C2).
 */
data class OemStockGroup(
    val oemPart: OemPart,
    val fabricantes: List<String>,
    val stockTotal: Int,
    val reorderPoint: Int,
    val esCritico: Boolean
)