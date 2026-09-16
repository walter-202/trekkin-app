package com.autopartes.domain.usecase

import com.autopartes.domain.repository.SessionManager

/** Cierre de sesion seguro (RF-01 C3, HU-01): revoca la sesion local. */
class LogoutUser(private val sessionManager: SessionManager) {

    suspend operator fun invoke() {
        sessionManager.clear()
    }
}