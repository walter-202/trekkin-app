package com.autopartes.domain.usecase

import com.autopartes.domain.error.OrderError
import com.autopartes.domain.model.PurchaseOrderDraft
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.PurchaseOrderRepository
import com.autopartes.domain.repository.SessionManager

/**
 * Sugerencia de Orden de Compra del administrador (HU-08, RF-13).
 * El RBAC (solo rol ADMIN, RF-13) se valida en dominio vía la sesión activa; la UI solo
 * oculta la entrada (defensa en profundidad, nunca seguridad sola en UI). Delega en el
 * puerto [PurchaseOrderRepository] la generación del borrador: el cálculo de líneas
 * (RF-13 C2), el proveedor (RF-13 C1) y la persistencia en estado `borrador` (RF-13 C3).
 */
class GeneratePurchaseOrder(
    private val repository: PurchaseOrderRepository,
    private val sessionManager: SessionManager
) {

    suspend operator fun invoke(): PurchaseOrderDraft {
        requireAdmin()
        return repository.generarBorradorDeOC()
    }

    /** El actor sale de la sesión activa (Gate por rol, RF-13). */
    private suspend fun requireAdmin() {
        val session = sessionManager.currentSession() ?: throw OrderError.SoloAdmin
        val rol = session.user.rol
        if (rol != UserRole.ADMIN) {
            throw OrderError.SoloAdmin
        }
    }
}