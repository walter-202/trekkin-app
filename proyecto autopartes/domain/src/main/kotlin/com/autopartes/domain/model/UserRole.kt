package com.autopartes.domain.model

/**
 * Rol de acceso del usuario en la plataforma (RF-01, RF-04).
 * V1.0: Cliente (default), Vendedor y Administrador.
 */
enum class UserRole(val etiqueta: String) {
    CLIENTE("Cliente"),
    VENDEDOR("Vendedor"),
    ADMIN("Administrador")
}