package com.autopartes.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.autopartes.data.local.entity.OemPartEntity
import com.autopartes.data.local.entity.PartVariantEntity

/**
 * Base local. HU-01: `users`. HU-04: `oem_parts` + `part_variants` (catálogo).
 * Garaje (HU-03) y clases futuras incrementan la versión.
 */
@Database(
    entities = [
        UserEntity::class,
        OemPartEntity::class,
        PartVariantEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun userDao(): UserDao

    abstract fun catalogDao(): CatalogDao
}