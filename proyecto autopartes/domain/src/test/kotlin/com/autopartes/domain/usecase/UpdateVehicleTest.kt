package com.autopartes.domain.usecase

import com.autopartes.domain.FakeGarageRepository
import com.autopartes.domain.error.GarageError
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class UpdateVehicleTest {

    private val repository = FakeGarageRepository()

    @Before
    fun setUp() {
        repository.vehicles.clear()
        repository.nextId = 1
    }

    @Test
    fun `edita los campos del vehiculo`() = runBlocking {
        val creado = repository.createVehicle("u-1", "Toyota", "Hilux", 2018, "2.7L")

        val actualizado = UpdateVehicle(repository)(
            userId = "u-1",
            vehicleId = creado.id,
            marca = "Suzuki",
            modelo = "Jimny",
            anio = 2021,
            cilindradaMotor = "1.5L"
        )

        assertEquals("Suzuki", actualizado.marca)
        assertEquals("Jimny", actualizado.modelo)
        assertEquals(2021, actualizado.anio)
        assertEquals("1.5L", actualizado.cilindradaMotor)
    }

    @Test
    fun `la edicion no cambia el estado activo`() = runBlocking {
        val creado = repository.createVehicle("u-1", "Toyota", "Hilux", 2018, "2.7L")
        assertTrue(creado.esActivo)

        val actualizado = UpdateVehicle(repository)(
            userId = "u-1",
            vehicleId = creado.id,
            marca = "Toyota",
            modelo = "Rav4",
            anio = 2020,
            cilindradaMotor = "2.5L"
        )

        assertTrue(actualizado.esActivo)
    }

    @Test
    fun `dato invalido es error`() = runBlocking {
        val creado = repository.createVehicle("u-1", "Toyota", "Hilux", 2018, "2.7L")

        val error = try {
            UpdateVehicle(repository)("u-1", creado.id, "T", "Hilux", 2018, "2.7L")
            null
        } catch (e: GarageError) {
            e
        }

        assertTrue(error is GarageError.DatosInvalidos)
    }
}