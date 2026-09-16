package com.autopartes.domain.error

/** Errores del Garaje Virtual (HU-03, RF-02/RF-03/RF-05). */
sealed class GarageError(message: String) : Exception(message) {

    data class DatosInvalidos(val detalle: String) : GarageError(detalle)

    data object VehiculoNoEncontrado : GarageError("El vehículo no existe o no pertenece al usuario.")

    data object ErrorDesconocido : GarageError("Ocurrió un error inesperado al gestionar el garaje.")
}