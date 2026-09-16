package com.autopartes.data.local

/**
 * Seed demo de la cuenta admin (HU-02, espejo de SEED_ADMIN_ACCOUNTS de trekkin).
 * Solo se inserta si la tabla `users` está vacía; no toca bases pobladas.
 * En producción el admin se crea por la API, no por seed.
 */
object UserSeed {
    const val ADMIN_NOMBRE = "Administrador Demo"
    const val ADMIN_EMAIL = "admin@autopartes.bo"
    const val ADMIN_PASSWORD = "Admin123456"
}