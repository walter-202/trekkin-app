package com.autopartes.domain.usecase

import com.autopartes.domain.model.UserSession
import com.autopartes.domain.repository.SessionManager
import com.autopartes.domain.repository.TokenGenerator
import com.autopartes.domain.repository.UserRepository

/**
 * Login (RF-01 C2, HU-01). Autentica en [UserRepository], genera el token de sesion
 * y lo persiste localmente. Devuelve [UserSession] para la UI.
 */
class LoginUser(
    private val repository: UserRepository,
    private val sessionManager: SessionManager,
    private val tokenGenerator: TokenGenerator
) {

    suspend operator fun invoke(email: String, password: String): UserSession {
        val user = repository.authenticate(email.trim().lowercase(), password)
        val session = UserSession(accessToken = tokenGenerator.generate(user), user = user)
        sessionManager.save(session)
        return session
    }
}