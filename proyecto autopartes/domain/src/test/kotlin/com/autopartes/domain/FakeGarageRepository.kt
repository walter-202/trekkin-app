package com.autopartes.domain

import com.autopartes.domain.model.Vehicle
import com.autopartes.domain.repository.GarageRepository

/** Garaje fake en memoria para pruebas de dominio (HU-03). */
class FakeGarageRepository : GarageRepository {

    val vehicles = mutableListOf<Vehicle>()
    var nextId = 1

    fun agregar(vehicle: Vehicle) {
        vehicles.removeAll { it.id == vehicle.id }
        vehicles.add(vehicle)
    }

    private fun nuevoId() = "v-${nextId++}"

    override suspend fun listByUser(userId: String): List<Vehicle> =
        vehicles.filter { it.userId == userId }

    override suspend fun createVehicle(
        userId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    ): Vehicle {
        val esPrimero = vehicles.none { it.userId == userId }
        val vehicle = Vehicle(
            id = nuevoId(),
            userId = userId,
            marca = marca,
            modelo = modelo,
            anio = anio,
            cilindradaMotor = cilindradaMotor,
            esActivo = esPrimero
        )
        vehicles.add(vehicle)
        return vehicle
    }

    override suspend fun updateVehicle(
        userId: String,
        vehicleId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    ): Vehicle {
        val index = vehicles.indexOfFirst { it.id == vehicleId && it.userId == userId }
        check(index >= 0) { "Vehiculo no encontrado" }
        val actualizado = vehicles[index].copy(
            marca = marca,
            modelo = modelo,
            anio = anio,
            cilindradaMotor = cilindradaMotor
        )
        vehicles[index] = actualizado
        return actualizado
    }

    override suspend fun setActiveVehicle(userId: String, vehicleId: String): Vehicle {
        check(vehicles.any { it.id == vehicleId && it.userId == userId }) {
            "Vehiculo no encontrado"
        }
        vehicles.replaceAll {
            if (it.userId == userId) it.copy(esActivo = it.id == vehicleId) else it
        }
        return vehicles.first { it.id == vehicleId }
    }

    override suspend fun getActiveVehicle(userId: String): Vehicle? =
        vehicles.firstOrNull { it.userId == userId && it.esActivo }
}