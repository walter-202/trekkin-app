package com.autopartes.domain.usecase

import com.autopartes.domain.FakeUserRepository
import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.UserRole
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RegisterUserTest {

    private val repository = FakeUserRepository()
    private val usecase = RegisterUser(repository)

    @Before
    fun setUp() {
        repository.clear()
    }

    @Test
    fun `registra usuario con rol cliente por defecto y estado activo`() = runBlocking {
        val user = usecase("Mateo Condori", "mateo@example.com", "12345678")

        assertEquals(UserRole.CLIENTE, user.rol)
        assertEquals(AccountStatus.ACTIVO, user.estado)
        assertEquals("mateo@example.com", user.email)
        assertTrue(repository.findByEmail("mateo@example.com") != null)
    }

    @Test
    fun `rechaza correo duplicado`() = runBlocking {
        usecase("Ana", "ana@example.com", "12345678")

        val error = capturarError { usecase("Ana Torres", "ANA@example.com", "87654321") }

        assertTrue(error is AuthError.EmailYaRegistrado)
    }

    @Test
    fun `rechaza nombre corto`() = runBlocking {
        val error = capturarError { usecase("An", "ana@example.com", "12345678") }

        assertTrue(error is AuthError.DatosInvalidos)
    }

    @Test
    fun `rechaza correo invalido`() = runBlocking {
        val error = capturarError { usecase("Ana Torres", "no-es-correo", "12345678") }

        assertTrue(error is AuthError.DatosInvalidos)
    }

    @Test
    fun `rechaza contrasena menor a 8 caracteres`() = runBlocking {
        val error = capturarError { usecase("Ana Torres", "ana@example.com", "1234567") }

        assertTrue(error is AuthError.DatosInvalidos)
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