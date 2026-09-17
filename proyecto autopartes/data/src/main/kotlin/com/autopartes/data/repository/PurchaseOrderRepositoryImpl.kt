package com.autopartes.data.repository

import com.autopartes.data.local.OrderDao
import com.autopartes.data.local.SupplierDao
import com.autopartes.data.local.SupplierSeed
import com.autopartes.data.local.entity.PurchaseOrderDraftEntity
import com.autopartes.data.local.entity.PurchaseOrderLineEntity
import com.autopartes.data.local.entity.SupplierEntity
import com.autopartes.data.local.entity.toDomain
import com.autopartes.domain.error.OrderError
import com.autopartes.domain.model.OemStockGroup
import com.autopartes.domain.model.PurchaseOrderDraft
import com.autopartes.domain.model.PurchaseOrderLine
import com.autopartes.domain.repository.InventoryRepository
import com.autopartes.domain.repository.PurchaseOrderRepository
import com.autopartes.domain.repository.SessionManager
import java.util.UUID
import javax.inject.Inject

/**
 * Implementa [PurchaseOrderRepository] sobre Room (HU-08, RF-13).
 *
 * Reutiliza [InventoryRepository.stockAgrupadoPorOem] (el miso agrupamiento OEM de
 * HU-07) para calcular las líneas: solo los grupos bajo reorden (RF-13 C2), con
 * `cantidadRequerida = reorderPoint - stockTotal` (mín. 0; los grupos con 0 se excluyen).
 *
 * Heurística de proveedor (RF-13 C1): se elige el primer proveedor cuya razón social
 * contiene la marca de alguna variante del grupo más urgente (menor stock bajo reorden,
 * el primero tras ordenar ascendente). `suppliers` no guarda marca, por eso el match es
 * por nombre (p. ej. "Bosch Bolivia SRL" ↔ variante "Bosch"). Si ninguno matchea, se usa
 * el primer proveedor del seed. Persiste el borrador con `estado = "borrador"` (RF-13 C3).
 */
class PurchaseOrderRepositoryImpl @Inject constructor(
    private val inventoryRepository: InventoryRepository,
    private val orderDao: OrderDao,
    private val supplierDao: SupplierDao,
    private val sessionManager: SessionManager
) : PurchaseOrderRepository {

    override suspend fun generarBorradorDeOC(): PurchaseOrderDraft {
        val session = sessionManager.currentSession() ?: throw OrderError.SoloAdmin
        return try {
            inventoryRepository.ensureSeeded()
            ensureSuppliersSeeded()

            val gruposBajoReorden = inventoryRepository.stockAgrupadoPorOem()
                .filter { it.stockTotal < it.reorderPoint }
                .sortedBy { it.stockTotal }

            if (gruposBajoReorden.isEmpty()) throw OrderError.SinGruposBajoReorden

            val proveedor = elegirProveedor(gruposBajoReorden)
                ?: throw OrderError.ProveedorNoEncontrado

            val id = UUID.randomUUID().toString()
            val fecha = System.currentTimeMillis()

            val lineas = construirLineas(gruposBajoReorden)
            if (lineas.isEmpty()) throw OrderError.SinGruposBajoReorden

            orderDao.guardarBorrador(
                draft = PurchaseOrderDraftEntity(
                    id = id,
                    supplierId = proveedor.id,
                    createdBy = session.user.id,
                    estado = PurchaseOrderDraft.ESTADO_BORRADOR,
                    fecha = fecha
                ),
                lineas = lineas.map {
                    PurchaseOrderLineEntity(
                        id = it.id,
                        poDraftId = id,
                        oemPartId = it.oemPartId,
                        stockActual = it.stockActual,
                        cantidadRequerida = it.cantidadRequerida
                    )
                }
            )

            PurchaseOrderDraft(
                id = id,
                supplierId = proveedor.id,
                supplierNombre = proveedor.nombre,
                createdBy = session.user.id,
                estado = PurchaseOrderDraft.ESTADO_BORRADOR,
                fecha = fecha,
                lineas = lineas
            )
        } catch (e: OrderError) {
            throw e
        } catch (e: Exception) {
            throw OrderError.ErrorDesconocido
        }
    }

    override suspend fun obtenerBorrador(id: String): PurchaseOrderDraft? {
        val draft = orderDao.getDraftById(id) ?: return null
        val proveedorNombre = supplierDao.getAll().firstOrNull { it.id == draft.supplierId }?.nombre
            ?: draft.supplierId
        val lineas = orderDao.getLinesConOemByDraftId(id).map {
            PurchaseOrderLineEntity(
                id = it.id,
                poDraftId = it.poDraftId,
                oemPartId = it.oemPartId,
                stockActual = it.stockActual,
                cantidadRequerida = it.cantidadRequerida
            ).toDomain(codigoOem = it.codigoOem, nombreComun = it.nombreComun)
        }
        return draft.toDomain(supplierNombre = proveedorNombre, lineas = lineas)
    }

    /** Crea una línea por grupo bajo reorden; exige `cantidadRequerida > 0` (RF-13 C2). */
    private fun construirLineas(grupos: List<OemStockGroup>): List<PurchaseOrderLine> =
        grupos.mapNotNull { grupo ->
            val requerida = (grupo.reorderPoint - grupo.stockTotal).coerceAtLeast(0)
            if (requerida <= 0) return@mapNotNull null
            PurchaseOrderLine(
                id = UUID.randomUUID().toString(),
                oemPartId = grupo.oemPart.id,
                codigoOem = grupo.oemPart.codigoOem,
                nombreComun = grupo.oemPart.nombreComun,
                stockActual = grupo.stockTotal,
                cantidadRequerida = requerida
            )
        }

    private suspend fun ensureSuppliersSeeded() {
        if (supplierDao.count() == 0) {
            supplierDao.insertAll(SupplierSeed.suppliers)
        }
    }

    /**
     * Ver [PurchaseOrderRepositoryImpl] KDoc: primero que matchee con la marca del grupo
     * más urgente, o el primero del seed como respaldo.
     */
    private suspend fun elegirProveedor(gruposBajoReorden: List<OemStockGroup>): SupplierEntity? {
        val proveedores = supplierDao.getAll()
        if (proveedores.isEmpty()) return null
        val marcasDelMasUrgente = gruposBajoReorden.first().fabricantes
        return proveedores.firstOrNull { proveedor ->
            marcasDelMasUrgente.any { marca ->
                proveedor.nombre.contains(marca, ignoreCase = true)
            }
        } ?: proveedores.first()
    }
}