package com.autopartes.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Base local de HU-01 (solo `users`; Garaje/catálogo llegan con HU-03/HU-04).
 */
@Database(entities = [UserEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun userDao(): UserDao
}