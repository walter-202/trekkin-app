package com.autopartes.domain.usecase

import com.autopartes.domain.error.GarageError
import com.autopartes.domain.model.Vehicle
import com.autopartes.domain.repository.GarageRepository
import java.time.Year

/** Edita un vehiculo del usuario (HU-03, RF-02 C2). No cambia el estado activo. */
class UpdateVehicle(private val repository: GarageRepository) {

    suspend operator fun invoke(
        userId: String,
        vehicleId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    ): Vehicle {
        validar(marca, modelo, anio, cilindradaMotor)

        return repository.updateVehicle(
            userId = userId,
            vehicleId = vehicleId,
            marca = marca.trim(),
            modelo = modelo.trim(),
            anio = anio,
            cilindradaMotor = cilindradaMotor.trim()
        )
    }

    private fun validar(marca: String, modelo: String, anio: Int, cilindradaMotor: String) {
        if (marca.trim().length < 2) {
            throw GarageError.DatosInvalidos("Indica la marca del vehículo.")
        }
        if (modelo.trim().length < 1) {
            throw GarageError.DatosInvalidos("Indica el modelo del vehículo.")
        }
        val actual = Year.now().value
        if (anio < 1900 || anio > actual + 1) {
            throw GarageError.DatosInvalidos("El año debe estar entre 1900 y ${actual + 1}.")
        }
        if (cilindradaMotor.trim().length < 1) {
            throw GarageError.DatosInvalidos("Indica la cilindrada/motor del vehículo.")
        }
    }
}