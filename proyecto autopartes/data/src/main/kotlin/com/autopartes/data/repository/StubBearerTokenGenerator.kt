package com.autopartes.data.repository

import android.content.Context
import android.util.Base64
import com.autopartes.domain.repository.TokenGenerator
import javax.inject.Inject
import com.autopartes.domain.model.User

/**
 * Generador de token de sesion del scaffold.
 * V1.0 real: JWT firmado + refresh token emitidos por la API (docs/ARCHITECTURE.md),
 * con token_version para invalidacion inmediata (RF-04). Este stub permite que :app
 * fluya sin backend todavia.
 */
class StubBearerTokenGenerator @Inject constructor() : TokenGenerator {

    override fun generate(user: User): String {
        val payload = Base64.encodeToString(
            "${user.id}:${user.email}".toByteArray(Charsets.UTF_8),
            Base64.NO_WRAP
        )
        return "ap1.$payload"
    }
}