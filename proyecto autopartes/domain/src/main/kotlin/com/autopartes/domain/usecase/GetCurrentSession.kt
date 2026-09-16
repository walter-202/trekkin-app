package com.autopartes.domain.usecase

import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.UserSession
import com.autopartes.domain.repository.SessionManager
import com.autopartes.domain.repository.UserRepository

/**
 * Restaura la sesion persistente al arrancar la app (Hidratacion del Gate, RF-01 C2/C4).
 * Revalida la sesion contra la base (RF-04 C5): si el usuario fue bloqueado o su
 * tokenVersion cambio (rol/estado editado por el admin), la sesion se invalida
 * (kick en vivo: la siguiente rehidratacion rechaza la sesion guardada).
 */
class GetCurrentSession(
    private val sessionManager: SessionManager,
    private val userRepository: UserRepository
) {

    suspend operator fun invoke(): UserSession? {
        val session = sessionManager.currentSession() ?: return null

        val actual = userRepository.findById(session.user.id) ?: run {
            sessionManager.clear()
            return null
        }

        if (actual.estado == AccountStatus.BLOQUEADO ||
            actual.tokenVersion != session.user.tokenVersion
        ) {
            sessionManager.clear()
            return null
        }

        return session.copy(user = actual)
    }
}