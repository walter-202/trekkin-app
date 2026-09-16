package com.autopartes.domain.usecase

import com.autopartes.domain.FakeGarageRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SetActiveVehicleTest {

    private val repository = FakeGarageRepository()

    @Before
    fun setUp() {
        repository.vehicles.clear()
        repository.nextId = 1
    }

    @Test
    fun `crea dos vehiculos y activa el segundo`() = runBlocking {
        val primero = repository.createVehicle("u-1", "Suzuki", "Vitara", 2015, "1.6L")
        val segundo = repository.createVehicle("u-1", "Toyota", "Hilux", 2018, "2.7L")
        assertTrue(primero.esActivo)
        assertTrue(!segundo.esActivo)

        val activo = SetActiveVehicle(repository)("u-1", segundo.id)

        assertTrue(activo.esActivo)
        assertEquals(segundo.id, repository.getActiveVehicle("u-1")?.id)
    }

    @Test
    fun `solo un vehiculo activo por usuario`() = runBlocking {
        repository.createVehicle("u-1", "Suzuki", "Vitara", 2015, "1.6L")
        val segundo = repository.createVehicle("u-1", "Toyota", "Hilux", 2018, "2.7L")

        SetActiveVehicle(repository)("u-1", segundo.id)

        val activos = repository.vehicles.filter { it.esActivo }
        assertEquals(1, activos.size)
    }
}