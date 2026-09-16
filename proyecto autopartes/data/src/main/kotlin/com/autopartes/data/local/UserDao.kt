package com.autopartes.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface UserDao {

    @Query("SELECT * FROM users WHERE email = :email LIMIT 1")
    suspend fun findByEmail(email: String): UserEntity?

    @Query("SELECT * FROM users WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): UserEntity?

    @Query("SELECT * FROM users ORDER BY nombreCompleto COLLATE NOCASE ASC")
    suspend fun listAll(): List<UserEntity>

    @Query("SELECT COUNT(*) FROM users")
    suspend fun count(): Int

    /**
     * Inserta un usuario. Un correo duplicado (UNIQUE) lanza SQLiteConstraintException,
     * que el repositorio traduce a AuthError.EmailYaRegistrado.
     */
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(user: UserEntity): Long

    /** Cambia el rol e incrementa la version de token (RF-04 C5). Devuelve filas afectadas. */
    @Query("UPDATE users SET rol = :rol, tokenVersion = tokenVersion + 1 WHERE id = :id")
    suspend fun updateRol(id: String, rol: String): Int

    /** Cambia el estado e incrementa la version de token (RF-04 C5). Devuelve filas afectadas. */
    @Query("UPDATE users SET estado = :estado, tokenVersion = tokenVersion + 1 WHERE id = :id")
    suspend fun updateEstado(id: String, estado: String): Int
}