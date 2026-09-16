package com.autopartes.domain.model

/** Perfil de usuario registrado. */
data class User(
    val id: String,
    val nombreCompleto: String,
    val email: String,
    val rol: UserRole,
    val estado: AccountStatus
)