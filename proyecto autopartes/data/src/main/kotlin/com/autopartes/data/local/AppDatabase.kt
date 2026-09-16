package com.autopartes.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.autopartes.data.local.entity.OemPartEntity
import com.autopartes.data.local.entity.PartVariantEntity
import com.autopartes.data.local.entity.VehicleCompatibilityEntity
import com.autopartes.data.local.entity.VehicleEntity

/**
 * Base local. HU-01: `users`. HU-04: `oem_parts` + `part_variants` (catálogo).
 * HU-03: `vehicles` + `vehicle_compatibilities` (garaje virtual + filtro RF-05).
 */
@Database(
    entities = [
        UserEntity::class,
        OemPartEntity::class,
        PartVariantEntity::class,
        VehicleEntity::class,
        VehicleCompatibilityEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun userDao(): UserDao

    abstract fun catalogDao(): CatalogDao

    abstract fun garageDao(): GarageDao
}