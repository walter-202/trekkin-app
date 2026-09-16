package com.autopartes.data.local

import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole

/** Mapeo entidad de Room -> modelo de dominio (el dominio no conoce Room). */
fun UserEntity.toDomain(): User = User(
    id = id,
    nombreCompleto = nombreCompleto,
    email = email,
    rol = UserRole.valueOf(rol),
    estado = AccountStatus.valueOf(estado)
)