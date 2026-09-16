package com.autopartes.domain.usecase

import com.autopartes.domain.FakeInventoryRepository
import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.error.InventoryError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.model.UserSession
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Panel de Stock Critico del admin (HU-07, RF-11/RF-12): RBAC + filtro + orden. */
class ListCriticalStockGroupsTest {

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
    fun `admin ve solo los grupos criticos ordenados por stock ascendente`() = runBlocking {
        sessions.save(sesion(UserRole.ADMIN))

        val resultado = ListCriticalStockGroups(repository, sessions)()

        assertTrue(resultado.isNotEmpty())
        assertTrue(resultado.all { it.esCritico })
        assertEquals(
            resultado.map { it.stockTotal },
            resultado.map { it.stockTotal }.sorted()
        )
        assertEquals("o-5", resultado.first().oemPart.id)
        assertTrue(resultado.first().esCritico)
        assertEquals(4, resultado.first().stockTotal)
        assertEquals(6, resultado.first().reorderPoint)
        assertTrue(resultado.none { it.oemPart.id == "o-1" })
        repository.clear()
    }

    @Test
    fun `cliente autenticado no puede ver el panel`() = runBlocking {
        sessions.save(sesion(UserRole.CLIENTE))

        val error = capturar { ListCriticalStockGroups(repository, sessions)() }

        assertTrue(error is InventoryError.SoloAdmin)
    }

    @Test
    fun `vendedor no puede ver el panel`() = runBlocking {
        sessions.save(sesion(UserRole.VENDEDOR))

        val error = capturar { ListCriticalStockGroups(repository, sessions)() }

        assertTrue(error is InventoryError.SoloAdmin)
    }

    @Test
    fun `sin sesion activa lanza SoloAdmin`() = runBlocking {
        val error = capturar { ListCriticalStockGroups(repository, sessions)() }

        assertTrue(error is InventoryError.SoloAdmin)
    }
}