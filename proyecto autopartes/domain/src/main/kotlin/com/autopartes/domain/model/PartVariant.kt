package com.autopartes.domain.model

/**
 * Variante (repuesto equivalente por fabricante) bajo un mismo codigo OEM (RF-07, RF-11).
 */
data class PartVariant(
    val id: String,
    val oemPartId: String,
    val marcaFabricante: String,
    val codigoFabricante: String,
    val nombreComercial: String,
    val precioUnitario: Double
)