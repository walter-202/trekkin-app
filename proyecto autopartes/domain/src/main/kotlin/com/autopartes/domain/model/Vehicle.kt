package com.autopartes.domain.model

/**
 * Vehiculo del Garaje Virtual (HU-03, RF-02). SIN numero de placa (exclusion V1.0).
 * Campos obligatorios: Marca, Modelo, Año y Cilindrada/Motor.
 */
data class Vehicle(
    val id: String,
    val userId: String,
    val marca: String,
    val modelo: String,
    val anio: Int,
    val cilindradaMotor: String,
    val esActivo: Boolean
)