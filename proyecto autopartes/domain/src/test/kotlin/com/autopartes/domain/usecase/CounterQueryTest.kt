package com.autopartes.domain.usecase

import com.autopartes.domain.FakeInventoryRepository
import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.error.CounterError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.model.UserSession
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Consulta rápida del mostrador vendedor (HU-06, RF-10): RBAC + stock total. */
class CounterQueryTest {

    private val repository = FakeInventoryRepository()
    private val sessions = FakeSessionManager()

    @Before
    fun setUp() {
        repository.clear()
        sessions.clear()
    }

    private suspend fun sesion(rol: UserRole) = UserSession(
        accessToken = "token-$rol",
        user = User(
            id = "uid-$rol",
            nombreCompleto = "Usuario $rol",
            email = "$rol@autopartes.bo",
            rol = rol,
            estado = AccountStatus.ACTIVO
        )
    )

    private suspend fun capturar(bloque: suspend () -> Unit): Exception? =
        try {
            bloque()
            null
        } catch (e: Exception) {
            e
        }

    @Test
    fun `vendedor consulta y ve el stock total del grupo OEM`() = runBlocking {
        sessions.save(sesion(UserRole.VENDEDOR))

        val resultado = CounterQuery(repository, sessions)("pastillas")

        assertEquals(1, resultado.size)
        assertEquals("o-1", resultado.first().oemPart.id)
        assertEquals(23, resultado.first().stockTotal) // 14 + 9
        assertEquals(2, resultado.first().variantes.size)
        repository.clear()
    }

    @Test
    fun `vendedor busca por nombre comun u codigo OEM`() = runBlocking {
        sessions.save(sesion(UserRole.VENDEDOR))

        val porNombre = CounterQuery(repository, sessions)("Filtro de aire")
        val porCodigo = CounterQuery(repository, sessions)("23300-0N250")

        assertEquals(1, porNombre.size)
        assertEquals("o-3", porNombre.first().oemPart.id)
        assertEquals(34, porNombre.first().stockTotal) // 22 + 12
        assertEquals("o-3", porCodigo.first().oemPart.id)
        repository.clear()
    }

    @Test
    fun `admin tambien puede usar el mostrador`() = runBlocking {
        sessions.save(sesion(UserRole.ADMIN))

        val resultado = CounterQuery(repository, sessions)("pastillas")

        assertEquals(1, resultado.size)
        repository.clear()
    }

    @Test
    fun `sin sesion activa lanza SoloVendedores`() = runBlocking {
        val error = capturar { CounterQuery(repository, sessions)("pastillas") }

        assertTrue(error is CounterError.SoloVendedores)
    }

    @Test
    fun `cliente autenticado no puede usar el mostrador`() = runBlocking {
        sessions.save(sesion(UserRole.CLIENTE))

        val error = capturar { CounterQuery(repository, sessions)("pastillas") }

        assertTrue(error is CounterError.SoloVendedores)
    }

    @Test
    fun `busqueda vacia o solo espacios lanza BusquedaInvalida`() = runBlocking {
        sessions.save(sesion(UserRole.VENDEDOR))

        val error = capturar { CounterQuery(repository, sessions)("  ") }

        assertTrue(error is CounterError.BusquedaInvalida)
    }

    @Test
    fun `sin coincidencias devuelve lista vacia`() = runBlocking {
        sessions.save(sesion(UserRole.VENDEDOR))

        val resultado = CounterQuery(repository, sessions)("espejo retr" + "oviso")

        assertTrue(resultado.isEmpty())
        repository.clear()
    }
}