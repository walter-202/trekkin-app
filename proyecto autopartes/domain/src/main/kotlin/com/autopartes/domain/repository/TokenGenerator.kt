package com.autopartes.domain.repository

import com.autopartes.domain.model.User

/**
 * Puerto de generacion de token de sesion (RF-01 C2).
 * En V1.0 la emision JWT real + refresh con invalidacion por token_version (RF-04)
 * corresponde al servidor de la API; este puerto permite a :app no depender de ello.
 */
interface TokenGenerator {

    fun generate(user: User): String
}