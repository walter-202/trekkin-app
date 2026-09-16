package com.autopartes.domain

import com.autopartes.domain.model.User
import com.autopartes.domain.repository.TokenGenerator

/** Token fijo para pruebas. */
class FakeTokenGenerator : TokenGenerator {
    override fun generate(user: User): String = "token-fake"
}