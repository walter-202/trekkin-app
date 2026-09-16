package com.autopartes.domain.repository

import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.User

/**
 * Puerto de acceso a usuarios (HU-01). Implementado en :data (Room local).
 * No expone detalles de persistencia ni credenciales.
 */
interface UserRepository {

    suspend fun findByEmail(email: String): User?

    /** Crea un usuario con rol [UserRole.CLIENTE] por defecto (RF-01 C1). */
    suspend fun registerUser(nombreCompleto: String, email: String, password: String): User

    /**
     * Valida credenciales y devuelve el usuario autenticado (RF-01 C2).
     * @throws [AuthError.CredencialesInvalidas] si el correo no existe o la clave no coincide.
     * @throws [AuthError.CuentaBloqueada] si la cuenta esta bloqueada.
     */
    suspend fun authenticate(email: String, password: String): User
}