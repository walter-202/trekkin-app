package com.autopartes.domain.repository

import com.autopartes.domain.model.UserSession

/** Puerto de sesion persistente local (RF-01 C2/C3, RNF-03). */
interface SessionManager {

    suspend fun save(session: UserSession)

    suspend fun currentSession(): UserSession?

    /** Revoca/borra la sesion local (logout, RF-01 C3). */
    suspend fun clear()
}