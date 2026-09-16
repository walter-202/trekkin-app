package com.autopartes.domain.error

/** Errores del mostrador vendedor (HU-06, RF-10). */
sealed class CounterError(message: String) : Exception(message) {

    data class BusquedaInvalida(val detalle: String) : CounterError(detalle)

    data object SoloVendedores : CounterError("Solo el personal de ventas puede usar el mostrador.")

    data object ErrorDesconocido : CounterError("Ocurrió un error inesperado en el mostrador.")
}