package com.autopartes.domain

import com.autopartes.domain.error.OrderError
import com.autopartes.domain.model.OemStockGroup
import com.autopartes.domain.model.PurchaseOrderDraft
import com.autopartes.domain.model.PurchaseOrderLine
import com.autopartes.domain.repository.InventoryRepository
import com.autopartes.domain.repository.PurchaseOrderRepository

/**
 * Repositorio de OC fake en memoria (no usa Room) para HU-08 (RF-13). Espeja la lógica
 * de `PurchaseOrderRepositoryImpl`: reutiliza el inventario agrupado (el fake de HU-07),
 * filtra solo los grupos bajo reorden, calcula `reorderPoint - stock` (RF-13 C2) y guarda
 * el borrador con estado `borrador` (RF-13 C3). Cuando no hay grupos bajo reorden lanza
 * [OrderError.SinGruposBajoReorden] como el repositorio real (vía [forzarSinGrupos]).
 */
class FakePurchaseOrderRepository(
    private val inventory: InventoryRepository = FakeInventoryRepository()
) : PurchaseOrderRepository {

    var guardado: PurchaseOrderDraft? = null

    /** Simula que el inventario no tiene grupos bajo reorden (RF-13 C2). */
    var forzarSinGrupos = false

    override suspend fun generarBorradorDeOC(): PurchaseOrderDraft {
        if (forzarSinGrupos) throw OrderError.SinGruposBajoReorden

        val gruposBajoReorden = inventory.stockAgrupadoPorOem()
            .filter { it.stockTotal < it.reorderPoint }
            .sortedBy { it.stockTotal }

        val lineas = gruposBajoReorden.mapNotNull(::lineaPara)
        if (lineas.isEmpty()) throw OrderError.SinGruposBajoReorden

        val borrador = PurchaseOrderDraft(
            id = "po-1",
            supplierId = "sup-s1",
            supplierNombre = "Bosch Bolivia SRL",
            createdBy = "uid-admin",
            estado = PurchaseOrderDraft.ESTADO_BORRADOR,
            fecha = 1_700_000_000_000L,
            lineas = lineas
        )
        guardado = borrador
        return borrador
    }

    override suspend fun obtenerBorrador(id: String): PurchaseOrderDraft? =
        guardado?.takeIf { it.id == id }

    fun clear() {
        guardado = null
        forzarSinGrupos = false
    }

    private fun lineaPara(grupo: OemStockGroup): PurchaseOrderLine? {
        val requerida = (grupo.reorderPoint - grupo.stockTotal).coerceAtLeast(0)
        if (requerida <= 0) return null
        return PurchaseOrderLine(
            id = "pl-${grupo.oemPart.id}",
            oemPartId = grupo.oemPart.id,
            codigoOem = grupo.oemPart.codigoOem,
            nombreComun = grupo.oemPart.nombreComun,
            stockActual = grupo.stockTotal,
            cantidadRequerida = requerida
        )
    }
}