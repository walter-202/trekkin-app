package com.autopartes.domain.model

/**
 * Tarjeta resumen del catalogo (RF-07 C1): imagen (UI), nombre, marca, precio y codigo OEM.
 * La marca/precio de muestra corresponden a una variante representativa del grupo.
 */
data class CatalogSummary(
    val oemPart: OemPart,
    val marcaMuestra: String?,
    val precioMuestra: Double?
)