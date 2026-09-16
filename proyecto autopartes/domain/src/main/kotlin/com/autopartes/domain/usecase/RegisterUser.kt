package com.autopartes.domain.usecase

import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.UserRepository

private val EMAIL_REGEX = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

/**
 * Registro de cuenta (RF-01 C1, HU-01).
 * Valida los datos en el dominio, evita correos duplicados y crea el perfil con
 * rol CLIENTE por defecto y estado ACTIVO. No inicia sesion automaticamente.
 */
class RegisterUser(private val repository: UserRepository) {

    suspend operator fun invoke(nombreCompleto: String, email: String, password: String): User {
        val nombre = nombreCompleto.trim()
        val correo = email.trim().lowercase()
        validar(nombre, correo, password)

        if (repository.findByEmail(correo) != null) {
            throw AuthError.EmailYaRegistrado
        }

        return repository.registerUser(nombre, correo, password)
    }

    private fun validar(nombre: String, correo: String, password: String) {
        if (nombre.length < 3) {
            throw AuthError.DatosInvalidos("El nombre completo debe tener al menos 3 caracteres.")
        }
        if (!EMAIL_REGEX.matches(correo)) {
            throw AuthError.DatosInvalidos("El correo no tiene un formato válido.")
        }
        if (password.length < 8) {
            throw AuthError.DatosInvalidos("La contraseña debe tener al menos 8 caracteres.")
        }
    }
}