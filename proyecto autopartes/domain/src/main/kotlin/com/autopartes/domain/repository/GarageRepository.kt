package com.autopartes.domain.repository

import com.autopartes.domain.model.Vehicle

/**
 * Puerto del Garaje Virtual (HU-03). Solo usuarios autenticados (Gate).
 * La compatibilidad con el catalogo (RF-05) se expone via CompatibilityRepository.
 */
interface GarageRepository {

    suspend fun listByUser(userId: String): List<Vehicle>

    /**
     * Crea un vehiculo. Regla de garaje: si el usuario no tiene ningun vehiculo,
     * el primero queda marcado como activo (RF-03 C1).
     */
    suspend fun createVehicle(
        userId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    ): Vehicle

    suspend fun updateVehicle(
        userId: String,
        vehicleId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    ): Vehicle

    /** Marca un vehiculo como [activo] y desactiva los demas (unico activo por usuario). */
    suspend fun setActiveVehicle(userId: String, vehicleId: String): Vehicle

    suspend fun getActiveVehicle(userId: String): Vehicle?
}