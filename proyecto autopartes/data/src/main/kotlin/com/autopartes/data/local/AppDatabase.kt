package com.autopartes.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.autopartes.data.local.entity.InventoryEntity
import com.autopartes.data.local.entity.OemPartEntity
import com.autopartes.data.local.entity.PartVariantEntity
import com.autopartes.data.local.entity.PurchaseOrderDraftEntity
import com.autopartes.data.local.entity.PurchaseOrderLineEntity
import com.autopartes.data.local.entity.SupplierEntity
import com.autopartes.data.local.entity.VehicleCompatibilityEntity
import com.autopartes.data.local.entity.VehicleEntity

/**
 * Base local. HU-01: `users`. HU-04: `oem_parts` + `part_variants` (catálogo).
 * HU-03: `vehicles` + `vehicle_compatibilities` (garaje virtual + filtro RF-05).
 * HU-06: `inventory` (stock por variante, mostrador vendedor RF-10).
 * HU-08: `suppliers` + `purchase_order_drafts` + `purchase_order_lines` (RF-13).
 */
@Database(
    entities = [
        UserEntity::class,
        OemPartEntity::class,
        PartVariantEntity::class,
        VehicleEntity::class,
        VehicleCompatibilityEntity::class,
        InventoryEntity::class,
        SupplierEntity::class,
        PurchaseOrderDraftEntity::class,
        PurchaseOrderLineEntity::class
    ],
    version = 5,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun userDao(): UserDao

    abstract fun catalogDao(): CatalogDao

    abstract fun garageDao(): GarageDao

    abstract fun inventoryDao(): InventoryDao

    abstract fun supplierDao(): SupplierDao

    abstract fun orderDao(): OrderDao
}