package com.autopartes.domain.model

/**
 * Perfil de usuario registrado.
 * [tokenVersion] permite invalidar sesiones con cambio de rol o bloqueo (RF-04 C5):
 * cada operacion administrativa lo incrementa y la sesion guardada con una version
 * anterior deja de ser valida (kick en vivo).
 */
data class User(
    val id: String,
    val nombreCompleto: String,
    val email: String,
    val rol: UserRole,
    val estado: AccountStatus,
    val tokenVersion: Int = 0
)