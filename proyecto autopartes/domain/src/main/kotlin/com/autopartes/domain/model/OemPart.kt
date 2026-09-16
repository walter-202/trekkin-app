package com.autopartes.domain.model

/**
 * Repuesto estandarizado por codigo de fabrica (OEM). Agrupa variantes equivalentes
 * de distintos fabricantes (RF-06, RF-11).
 */
data class OemPart(
    val id: String,
    val codigoOem: String,
    val nombreComun: String,
    val categoria: String? = null,
    val reorderPoint: Int = 0
)