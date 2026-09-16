package com.autopartes.data.local

import java.security.MessageDigest

/**
 * Hash de contrasena (RNF-03). Scaffold V1.0: SHA-256 con salt.
 * Producir en produccion: bcrypt/argon2 con salt seguro (SecureRandom).
 */
class PasswordHasher {

    fun hash(password: String, salt: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$salt::$password".toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    fun verify(password: String, salt: String, expectedHash: String): Boolean =
        hash(password, salt) == expectedHash
}