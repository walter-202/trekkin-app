package com.autopartes.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.autopartes.data.local.entity.VehicleCompatibilityEntity
import com.autopartes.data.local.entity.VehicleEntity

@Dao
interface GarageDao {

    @Query("SELECT * FROM vehicles WHERE userId = :userId ORDER BY createdAt ASC")
    suspend fun getVehiclesByUser(userId: String): List<VehicleEntity>

    @Query("SELECT * FROM vehicles WHERE userId = :userId AND esActivo = 1 LIMIT 1")
    suspend fun findActiveByUser(userId: String): VehicleEntity?

    @Query("SELECT * FROM vehicles WHERE id = :vehicleId AND userId = :userId LIMIT 1")
    suspend fun getVehicle(userId: String, vehicleId: String): VehicleEntity?

    @Query("SELECT COUNT(*) FROM vehicles WHERE userId = :userId")
    suspend fun countByUser(userId: String): Int

    @Query("UPDATE vehicles SET esActivo = 0 WHERE userId = :userId AND esActivo = 1")
    suspend fun clearActiveByUser(userId: String)

    @Query("UPDATE vehicles SET marca = :marca, modelo = :modelo, anio = :anio, cilindradaMotor = :cilindradaMotor WHERE id = :vehicleId AND userId = :userId")
    suspend fun updateFields(
        userId: String,
        vehicleId: String,
        marca: String,
        modelo: String,
        anio: Int,
        cilindradaMotor: String
    )

    @Query("SELECT oemPartId FROM vehicle_compatibilities WHERE vehicleId = :vehicleId")
    suspend fun compatibleOemIds(vehicleId: String): List<String>

    @Query("DELETE FROM vehicle_compatibilities WHERE vehicleId = :vehicleId")
    suspend fun deleteCompatibilities(vehicleId: String)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertCompatibilities(rows: List<VehicleCompatibilityEntity>)

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertVehicle(vehicle: VehicleEntity): Long

    @Transaction
    suspend fun setActiveTransaction(userId: String, vehicleId: String) {
        clearActiveByUser(userId)
        updateActivo(vehicleId = vehicleId, userId = userId)
    }

    @Query("UPDATE vehicles SET esActivo = 1 WHERE id = :vehicleId AND userId = :userId")
    suspend fun updateActivo(userId: String, vehicleId: String)
}