package com.autopartes.domain.usecase

import com.autopartes.domain.FakeCatalogRepository
import com.autopartes.domain.error.CatalogError
import com.autopartes.domain.resumen
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SearchCatalogTest {

    private val repository = FakeCatalogRepository()
    private val usecase = SearchCatalog(repository)

    @Before
    fun setUp() {
        repository.seeded = false
        repository.agregar(
            resumen("Pastillas de freno delanteras", "04465-33490", "o-1")
        )
        repository.agregar(
            resumen("Bujía de encendido", "90919-01250", "o-2")
        )
        repository.agregar(
            resumen("Filtro de aire", "23300-0N250", "o-3")
        )
    }

    @Test
    fun `busca por nombre comun`() = runBlocking {
        val resultados = usecase("pastillas")

        assertEquals(1, resultados.size)
        assertEquals("o-1", resultados.first().oemPart.id)
    }

    @Test
    fun `busca por codigo OEM directo`() = runBlocking {
        val resultados = usecase("90919-01250")

        assertEquals(1, resultados.size)
        assertEquals("o-2", resultados.first().oemPart.id)
    }

    @Test
    fun `busca sin distinguir mayusculas`() = runBlocking {
        val resultados = usecase("BUJÍA")

        assertEquals(1, resultados.size)
        assertEquals("o-2", resultados.first().oemPart.id)
    }

    @Test
    fun `termino vacio es invalido`() = runBlocking {
        val error = try {
            usecase("   ")
            null
        } catch (e: CatalogError) {
            e
        }

        assertTrue(error is CatalogError.BusquedaInvalida)
    }

    @Test
    fun `sin coincidencias devuelve lista vacia`() = runBlocking {
        val resultados = usecase("no-existe")

        assertTrue(resultados.isEmpty())
    }

    @Test
    fun `garantiza el seed antes de buscar`() = runBlocking {
        usecase("bu")

        assertTrue(repository.seeded)
    }
}