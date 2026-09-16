package com.autopartes.domain.error

/** Errores del catalogo y busqueda (HU-04). */
sealed class CatalogError(message: String) : Exception(message) {

    data class BusquedaInvalida(val detalle: String) : CatalogError(detalle)

    data object ErrorDesconocido : CatalogError("Ocurrió un error inesperado al consultar el catálogo.")
}