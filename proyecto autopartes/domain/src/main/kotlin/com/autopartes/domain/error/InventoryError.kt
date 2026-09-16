package com.autopartes.domain.error

/**
 * Errores del inventario agrupado por OEM y alertas de stock critico (HU-07, RF-11/RF-12).
 * Sigue el patron de [CounterError]: mensajes descriptivos en espanol para la UI.
 */
sealed class InventoryError(message: String) : Exception(message) {

    data object SoloAdmin : InventoryError("Solo el administrador puede ver el inventario agrupado por código OEM.")

    data object ErrorDesconocido : InventoryError("Ocurrió un error inesperado al consultar el inventario.")
}