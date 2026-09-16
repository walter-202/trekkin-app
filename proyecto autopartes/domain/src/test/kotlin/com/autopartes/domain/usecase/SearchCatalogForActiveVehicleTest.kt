package com.autopartes.domain.usecase

import com.autopartes.domain.FakeCatalogRepository
import com.autopartes.domain.FakeCompatibilityRepository
import com.autopartes.domain.FakeGarageRepository
import com.autopartes.domain.FakeSessionManager
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.model.UserSession
import com.autopartes.domain.resumen
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SearchCatalogForActiveVehicleTest {

    private val catalog = FakeCatalogRepository()
    private val sesion = FakeSessionManager()
    private val garage = FakeGarageRepository()
    private val compat = FakeCompatibilityRepository()

    private val searchCatalog = SearchCatalog(catalog)
    private val usecase = SearchCatalogForActiveVehicle(
        searchCatalog = searchCatalog,
        sessionManager = sesion,
        garageRepository = garage,
        compatibilityRepository = compat
    )

    @Before
    fun setUp() {
        catalog.agregar(resumen("Pastillas de freno delanteras", "04465-33490", "o-1"))
        catalog.agregar(resumen("Bujía de encendido", "90919-01250", "o-2"))
        catalog.agregar(resumen("Filtro de aire", "23300-0N250", "o-3"))
    }

    private fun sesionDe(uId: String) = UserSession(
        accessToken = "ap1.fake",
        user = User(
            id = uId,
            nombreCompleto = "Cliente Demo",
            email = "demo@autopartes.bo",
            rol = UserRole.CLIENTE,
            estado = AccountStatus.ACTIVO
        )
    )

    @Test
    fun `sin sesion no acota el catalogo`() = runBlocking {
        sesion.sesion = null

        val resultados = usecase("freno")

        assertEquals(1, resultados.size)
        assertEquals("o-1", resultados.first().oemPart.id)
    }

    @Test
    fun `con vehiculo activo acota a compatibles`() = runBlocking {
        sesion.save(sesionDe("u-1"))
        val vehicle = garage.createVehicle("u-1", "Toyota", "Hilux", 2018, "2.7L")
        compat.agregar(vehicle.id, setOf("o-2", "o-3"))

        val resultados = usecase("freno")

        assertTrue(resultados.isEmpty())
    }

    @Test
    fun `con vehiculo activo compatible devuelve las partes compatibles`() = runBlocking {
        sesion.save(sesionDe("u-1"))
        val vehicle = garage.createVehicle("u-1", "Toyota", "Hilux", 2018, "2.7L")
        compat.agregar(vehicle.id, setOf("o-1"))

        val resultados = usecase("freno")

        assertEquals(1, resultados.size)
        assertEquals("o-1", resultados.first().oemPart.id)
    }

    @Test
    fun `usuario sin garaje no acota el catalogo`() = runBlocking {
        sesion.save(sesionDe("u-1"))

        val resultados = usecase("bu")

        assertEquals(1, resultados.size)
    }

    @Test
    fun `vehiculo sin compatibilidades no acota el catalogo`() = runBlocking {
        sesion.save(sesionDe("u-1"))
        garage.createVehicle("u-1", "Marca", "Desconocida", 2020, "1.8L")

        val resultados = usecase("freno")

        assertEquals(1, resultados.size)
    }
}