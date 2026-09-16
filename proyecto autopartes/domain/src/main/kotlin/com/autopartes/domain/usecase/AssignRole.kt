package com.autopartes.domain.usecase

import com.autopartes.domain.error.AdminError
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.SessionManager
import com.autopartes.domain.repository.UserRepository

/**
 * Cambia el rol de un usuario (RF-04 C3, HU-02). Requiere actor ADMIN.
 * El repositorio incrementa `tokenVersion` (RF-04 C5) para invalidar la sesion del afectado.
 */
class AssignRole(
    private val repository: UserRepository,
    private val sessionManager: SessionManager
) {

    suspend operator fun invoke(userId: String, nuevoRol: UserRole): User {
        requireAdmin()
        return repository.updateRol(userId, nuevoRol)
    }

    private suspend fun requireAdmin(): User {
        val session = sessionManager.currentSession() ?: throw AdminError.SoloAdministradores
        val actor = repository.findById(session.user.id) ?: throw AdminError.SoloAdministradores
        if (actor.rol != UserRole.ADMIN) throw AdminError.SoloAdministradores
        return actor
    }
}