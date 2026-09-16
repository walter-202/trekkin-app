package com.autopartes.domain

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
            id = key,
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