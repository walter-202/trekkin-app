package com.autopartes.domain.usecase

import com.autopartes.domain.FakeGarageRepository
import com.autopartes.domain.error.GarageError
import com.autopartes.domain.model.Vehicle
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RegisterVehicleTest {

    private val repository = FakeGarageRepository()
    private val usecase = RegisterVehicle(repository)

    @Before
    fun setUp() {
        repository.vehicles.clear()
        repository.nextId = 1
    }

    @Test
    fun `registra un vehiculo sin placa`() = runBlocking {
        val vehicle = usecase("u-1", "Toyota", "Hilux", 2018, "2.7L 4 cil.")

        assertEquals("Toyota", vehicle.marca)
        assertEquals("Hilux", vehicle.modelo)
        assertEquals(2018, vehicle.anio)
        assertEquals("2.7L 4 cil.", vehicle.cilindradaMotor)
        assertFalse(vehicle.id.isBlank())
    }

    @Test
    fun `el primer vehiculo queda activo`() = runBlocking {
        val vehicle = usecase("u-1", "Suzuki", "Vitara", 2015, "1.6L")

        assertTrue(vehicle.esActivo)
    }

    @Test
    fun `el segundo vehiculo no queda activo`() = runBlocking {
        usecase("u-1", "Suzuki", "Vitara", 2015, "1.6L")
        val segundo = usecase("u-1", "Toyota", "Hilux", 2018, "2.7L")

        assertFalse(segundo.esActivo)
    }

    @Test
    fun `marca vacia es invalida`() = runBlocking {
        val error = try {
            usecase("u-1", "  ", "Hilux", 2018, "2.7L")
            null
        } catch (e: GarageError) {
            e
        }

        assertTrue(error is GarageError.DatosInvalidos)
    }

    @Test
    fun `anio fuera de rango es invalido`() = runBlocking {
        val error = try {
            usecase("u-1", "Toyota", "Hilux", 1899, "2.7L")
            null
        } catch (e: GarageError) {
            e
        }

        assertTrue(error is GarageError.DatosInvalidos)
    }

    @Test
    fun `cilindrada vacia es invalida`() = runBlocking {
        val error = try {
            usecase("u-1", "Toyota", "Hilux", 2018, " ")
            null
        } catch (e: GarageError) {
            e
        }

        assertTrue(error is GarageError.DatosInvalidos)
    }
}