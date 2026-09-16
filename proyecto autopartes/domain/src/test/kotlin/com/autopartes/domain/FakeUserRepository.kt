package com.autopartes.domain

import com.autopartes.domain.error.AdminError
import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.UserRepository

/** Repositorio fake en memoria para pruebas de dominio (no usa Room ni red). */
class FakeUserRepository : UserRepository {

    private val users = mutableMapOf<String, User>()
    private val passwords = mutableMapOf<String, String>()

    override suspend fun findByEmail(email: String): User? = users[normalize(email)]

    override suspend fun registerUser(nombreCompleto: String, email: String, password: String): User {
        val key = normalize(email)
        if (users.containsKey(key)) throw AuthError.EmailYaRegistrado
        val user = User(
            id = "uid-$key",
            nombreCompleto = nombreCompleto,
            email = key,
            rol = UserRole.CLIENTE,
            estado = AccountStatus.ACTIVO
        )
        users[key] = user
        passwords[key] = password
        return user
    }

    override suspend fun authenticate(email: String, password: String): User {
        val key = normalize(email)
        val user = users[key] ?: throw AuthError.CredencialesInvalidas
        if (passwords[key] != password) throw AuthError.CredencialesInvalidas
        if (user.estado == AccountStatus.BLOQUEADO) throw AuthError.CuentaBloqueada
        return user
    }

    // ---- HU-02 (RF-04) ----

    override suspend fun findById(id: String): User? = users.values.firstOrNull { it.id == id }

    override suspend fun listAll(): List<User> = users.values.toList()

    override suspend fun updateRol(userId: String, nuevoRol: UserRole): User {
        val actual = findById(userId) ?: throw AdminError.UsuarioNoEncontrado
        val actualizado = actual.copy(rol = nuevoRol, tokenVersion = actual.tokenVersion + 1)
        users[actualizado.email] = actualizado
        return actualizado
    }

    override suspend fun setEstado(userId: String, nuevoEstado: AccountStatus): User {
        val actual = findById(userId) ?: throw AdminError.UsuarioNoEncontrado
        val actualizado = actual.copy(estado = nuevoEstado, tokenVersion = actual.tokenVersion + 1)
        users[actualizado.email] = actualizado
        return actualizado
    }

    override suspend fun ensureSeeded() {
        if (users.isNotEmpty()) return
        registerUser("Administrador Demo", "admin@autopartes.bo", "Admin123456")
        val admin = users["admin@autopartes.bo"]!!
        users["admin@autopartes.bo"] = admin.copy(rol = UserRole.ADMIN)
    }

    /** Alias de prueba para poblar el fake directamente (no rompe el API de tests). */
    suspend fun seed(user: User, password: String = "seed123456") {
        users[normalize(user.email)] = user
        passwords[normalize(user.email)] = password
    }

    fun bloquear(email: String) {
        val key = normalize(email)
        users[key] = (users[key] ?: return).copy(estado = AccountStatus.BLOQUEADO)
    }

    fun clear() {
        users.clear()
        passwords.clear()
    }

    private fun normalize(email: String) = email.trim().lowercase()
}