package com.autopartes.domain.model

/** Sesion activa: token de acceso + perfil (RF-01). */
data class UserSession(
    val accessToken: String,
    val user: User
)