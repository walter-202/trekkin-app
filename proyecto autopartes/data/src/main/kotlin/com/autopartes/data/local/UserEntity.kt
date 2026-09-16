package com.autopartes.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Persistencia local del usuario (mirror de `users` de docs/DATABASE.md).
 * El hash y el salt se guardan exclusivamente aqui; el dominio nunca los ve.
 */
@Entity(tableName = "users", indices = [Index(value = ["email"], unique = true)])
data class UserEntity(
    @PrimaryKey val id: String,
    val nombreCompleto: String,
    val email: String,
    val passwordHash: String,
    val salt: String,
    val rol: String,
    val estado: String,
    val tokenVersion: Int = 0
)