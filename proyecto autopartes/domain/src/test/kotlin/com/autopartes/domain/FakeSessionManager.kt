package com.autopartes.domain

import com.autopartes.domain.model.UserSession
import com.autopartes.domain.repository.SessionManager

/** Persistencia de sesion fake en memoria. */
class FakeSessionManager : SessionManager {

    var sesion: UserSession? = null
        private set

    override suspend fun save(session: UserSession) {
        sesion = session
    }

    override suspend fun currentSession(): UserSession? = sesion

    override suspend fun clear() {
        sesion = null
    }
}