package com.autopartes.domain.error

/**
 * Errores de la Sugerencia de Orden de Compra (HU-08, RF-13).
 * Sigue el patron de [CounterError] y [InventoryError]: sealed con mensajes
 * descriptivos en espanol para la UI.
 */
sealed class OrderError(message: String) : Exception(message) {

    data object SoloAdmin : OrderError("Solo el administrador puede generar órdenes de compra.")

    data object SinGruposBajoReorden : OrderError("No hay repuestos bajo su punto de reorden. No se genera orden de compra.")

    data object ProveedorNoEncontrado : OrderError("No se encontró un proveedor para sugerir la orden de compra.")

    data object ErrorDesconocido : OrderError("Ocurrió un error inesperado al generar la orden de compra.")
}