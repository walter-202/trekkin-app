package com.autopartes.domain.error

/** Errores del catalogo, busqueda y ficha tecnica (HU-04/HU-05). */
sealed class CatalogError(message: String) : Exception(message) {

    data class BusquedaInvalida(val detalle: String) : CatalogError(detalle)

    data object ProductoNoEncontrado : CatalogError("El repuesto solicitado no existe en el catálogo.")

    data object ErrorDesconocido : CatalogError("Ocurrió un error inesperado al consultar el catálogo.")
}