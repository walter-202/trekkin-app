package com.autopartes.domain.usecase

import com.autopartes.domain.FakeCatalogRepository
import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.error.CatalogError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.OemPart
import com.autopartes.domain.model.PartVariant
import com.autopartes.domain.model.ProductDetail
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.model.UserSession
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Ficha técnica con Gate RF-08 (HU-05): completa solo con sesión. */
class GetProductDetailTest {

    private val repository = FakeCatalogRepository()
    private val sessions = FakeSessionManager()

    private val detalle = ProductDetail(
        oemPart = OemPart("o-1", "04465-33490", "Pastillas de freno delanteras", "Frenos", 10),
        descripcion = "Repuesto demo.",
        variantes = listOf(
            PartVariant("v-1", "o-1", "Bosch", "BP341", "Pastillas Bosch", 120.0),
            PartVariant("v-2", "o-1", "Akebono", "AK-04465", "Pastillas Akebono", 98.0)
        ),
        stockTotal = 23
    )

    @Before
    fun setUp() {
        repository.agregarDetalle(detalle)
        sessions.clear()
    }

    private suspend fun sesion(rol: UserRole = UserRole.CLIENTE) = UserSession(
        accessToken = "token",
        user = User(
            id = "uid",
            nombreCompleto = "Usuario",
            email = "usuario@autopartes.bo",
            rol = rol,
            estado = AccountStatus.ACTIVO
        )
    )

    @Test
    fun `visitante ve solo el resumen sin precio ni stock`() = runBlocking {
        val detalle = GetProductDetail(repository, sessions)("o-1")

        assertFalse(detalle.esCompleta)
        assertNull(detalle.variantes)
        assertNull(detalle.stockTotal)
        assertEquals("o-1", detalle.oemPart.id)
    }

    @Test
    fun `cualquier rol autenticado ve la ficha completa`() = runBlocking {
        sessions.save(sesion(UserRole.CLIENTE))

        val detalle = GetProductDetail(repository, sessions)("o-1")

        assertTrue(detalle.esCompleta)
        assertEquals(2, detalle.variantes?.size)
        assertEquals(23, detalle.stockTotal)
    }

    @Test
    fun `oem inexistente lanza ProductoNoEncontrado`() = runBlocking {
        val error = capturar { GetProductDetail(repository, sessions)("no-existe") }

        assertTrue(error is CatalogError.ProductoNoEncontrado)
    }

    private suspend fun capturar(bloque: suspend () -> Unit): Exception? =
        try {
            bloque()
            null
        } catch (e: Exception) {
            e
        }
}