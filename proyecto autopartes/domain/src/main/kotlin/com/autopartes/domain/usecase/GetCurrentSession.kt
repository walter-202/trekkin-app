package com.autopartes.domain.usecase

import com.autopartes.domain.model.UserSession
import com.autopartes.domain.repository.SessionManager

/** Restaura la sesion persistente al arrancar la app (Hidratacion del Gate, RF-01 C2/C4). */
class GetCurrentSession(private val sessionManager: SessionManager) {

    suspend operator fun invoke(): UserSession? = sessionManager.currentSession()
}