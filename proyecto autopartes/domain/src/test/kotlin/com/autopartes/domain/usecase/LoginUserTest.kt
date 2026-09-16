package com.autopartes.domain.usecase

import com.autopartes.domain.error.AuthError
import org.junit.Assert.assertTrue
import kotlinx.coroutines.runBlocking
import com.autopartes.domain.FakeUserRepository
import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.FakeTokenGenerator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class LoginUserTest {

    private val repository = FakeUserRepository()
    private val sessions = FakeSessionManager()
    private val usecase = LoginUser(repository, sessions, FakeTokenGenerator())

    @Before
    fun setUp() {
        repository.clear()
        sessions.clear()
    }

    @Test
    fun `login con credenciales validas guarda sesion local`() = runBlocking {
        repository.registerUser("Mateo", "mateo@example.com", "12345678")

        val session = usecase("mateo@example.com", "12345678")

        assertEquals("token-fake", session.accessToken)
        assertEquals("mateo@example.com", session.user.email)
        assertEquals(session, sessions.currentSession())
    }

    @Test
    fun `login con contrasena incorrecta falla y no guarda sesion`() = runBlocking {
        repository.registerUser("Mateo", "mateo@example.com", "12345678")

        val error = capturarError { usecase("mateo@example.com", "incorrecta") }

        assertTrue(error is AuthError.CredencialesInvalidas)
        assertNull(sessions.currentSession())
    }

    @Test
    fun `login de cuenta bloqueada es rechazado`() = runBlocking {
        repository.registerUser("Mateo", "mateo@example.com", "12345678")
        repository.bloquear("mateo@example.com")

        val error = capturarError { usecase("mateo@example.com", "12345678") }

        assertTrue(error is AuthError.CuentaBloqueada)
        assertNull(sessions.currentSession())
    }

    @Test
    fun `login con correo inexistente falla con credenciales invalidas`() = runBlocking {
        val error = capturarError { usecase("nadie@example.com", "12345678") }

        assertTrue(error is AuthError.CredencialesInvalidas)
    }

    private suspend fun capturarError(bloque: suspend () -> Unit): AuthError? {
        return try {
            bloque()
            null
        } catch (e: AuthError) {
            e
        }
    }
}