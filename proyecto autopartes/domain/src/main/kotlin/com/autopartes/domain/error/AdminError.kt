package com.autopartes.domain.error

/**
 * Errores del panel de administracion de usuarios (HU-02, RF-04).
 * Mensajes descriptivos en espanol para la UI.
 */
sealed class AdminError(message: String) : Exception(message) {

    data object UsuarioNoEncontrado : AdminError("El usuario no existe.")

    data object DatosInvalidos : AdminError("Los filtros de búsqueda no son válidos.")

    data object SoloAdministradores : AdminError("Solo un administrador puede realizar esta acción.")

    data object ErrorDesconocido : AdminError("Ocurrió un error inesperado al gestionar usuarios.")
}