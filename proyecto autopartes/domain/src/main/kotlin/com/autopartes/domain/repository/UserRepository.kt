package com.autopartes.domain.repository

import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole

/**
 * Puerto de acceso a usuarios (HU-01/HU-02). Implementado en :data (Room local).
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

    // ---- HU-02 (RF-04): gestion de usuarios por el administrador ----

    suspend fun findById(id: String): User?

    /** Lista todos los usuarios registrados (el filtrado lo hace el caso de uso). */
    suspend fun listAll(): List<User>

    /** Cambia el rol y devuelve el usuario actualizado. Incrementa tokenVersion (RF-04 C5). */
    suspend fun updateRol(userId: String, nuevoRol: UserRole): User

    /** Bloquea o desbloquea la cuenta y devuelve el usuario actualizado. Incrementa tokenVersion. */
    suspend fun setEstado(userId: String, nuevoEstado: AccountStatus): User

    /**
     * Crea la cuenta admin demo si no existe ningun usuario (seed local de pruebas,
     * espejo de SEED_ADMIN_ACCOUNTS de trekkin; nunca crea sobre una base poblada).
     */
    suspend fun ensureSeeded()
}