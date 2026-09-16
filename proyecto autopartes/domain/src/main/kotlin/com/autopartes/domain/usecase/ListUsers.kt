package com.autopartes.domain.usecase

import com.autopartes.domain.error.AdminError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.SessionManager
import com.autopartes.domain.repository.UserRepository

/**
 * Lista usuarios con busqueda por nombre/correo y filtros de rol/estado (RF-04 C2, HU-02).
 * Valida en el dominio que el actor sea administrador (RBAC, no solo UI).
 */
class ListUsers(
    private val repository: UserRepository,
    private val sessionManager: SessionManager
) {

    suspend operator fun invoke(
        busqueda: String = "",
        rol: UserRole? = null,
        estado: AccountStatus? = null
    ): List<User> {
        val actor = requireAdmin()

        val texto = busqueda.trim()
        if (texto.length > MAX_BUSQUEDA) throw AdminError.DatosInvalidos

        val filtro = texto.lowercase()
        return repository.listAll().filter { it.coincide(filtro, rol, estado) }
    }

    /** El actor sale de la sesion activa (Gate); solo un ADMIN ejecuta este caso de uso. */
    private suspend fun requireAdmin(): User {
        val session = sessionManager.currentSession() ?: throw AdminError.SoloAdministradores
        val actor = repository.findById(session.user.id) ?: throw AdminError.SoloAdministradores
        if (actor.rol != UserRole.ADMIN) throw AdminError.SoloAdministradores
        return actor
    }

    private fun User.coincide(texto: String, rol: UserRole?, estado: AccountStatus?): Boolean {
        val porTexto = texto.isEmpty() ||
            nombreCompleto.lowercase().contains(texto) ||
            email.lowercase().contains(texto)
        val porRol = rol == null || this.rol == rol
        val porEstado = estado == null || this.estado == estado
        return porTexto && porRol && porEstado
    }

    private companion object {
        const val MAX_BUSQUEDA = 60
    }
}