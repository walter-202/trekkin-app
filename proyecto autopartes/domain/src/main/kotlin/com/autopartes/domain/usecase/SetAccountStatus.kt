package com.autopartes.domain.usecase

import com.autopartes.domain.error.AdminError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.SessionManager
import com.autopartes.domain.repository.UserRepository

/**
 * Bloquea o desbloquea la cuenta de un usuario (RF-04 C4, HU-02).
 * Requiere actor ADMIN. El repositorio incrementa `tokenVersion` (RF-04 C5):
 * si el afectado tiene una sesion activa, la proxima rehidratacion la invalida (kick en vivo).
 */
class SetAccountStatus(
    private val repository: UserRepository,
    private val sessionManager: SessionManager
) {

    suspend operator fun invoke(userId: String, nuevoEstado: AccountStatus): User {
        requireAdmin()
        if (repository.findById(userId) == null) throw AdminError.UsuarioNoEncontrado
        return repository.setEstado(userId, nuevoEstado)
    }

    private suspend fun requireAdmin(): User {
        val session = sessionManager.currentSession() ?: throw AdminError.SoloAdministradores
        val actor = repository.findById(session.user.id) ?: throw AdminError.SoloAdministradores
        if (actor.rol != UserRole.ADMIN) throw AdminError.SoloAdministradores
        return actor
    }
}