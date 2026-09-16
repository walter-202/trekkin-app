package com.autopartes.domain.error

/**
 * Errores de autenticacion (HU-01). Mensajes descriptivos en espanol para la UI (RF-01 C5).
 */
sealed class AuthError(message: String) : Exception(message) {
    /** Datos incumplen las reglas de dominio (nombre, correo o contrasena). */
    data class DatosInvalidos(val detalle: String) : AuthError(detalle)

    data object EmailYaRegistrado : AuthError("El correo ya está registrado.")

    data object CredencialesInvalidas : AuthError("Correo o contraseña incorrectos.")

    data object CuentaBloqueada : AuthError("Tu cuenta está bloqueada. Contacta al administrador.")

    data object ErrorDesconocido : AuthError("Ocurrió un error inesperado. Intenta de nuevo.")
}