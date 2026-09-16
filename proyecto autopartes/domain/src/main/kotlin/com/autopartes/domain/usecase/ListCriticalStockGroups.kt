package com.autopartes.domain.usecase

import com.autopartes.domain.error.InventoryError
import com.autopartes.domain.model.OemStockGroup
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.InventoryRepository
import com.autopartes.domain.repository.SessionManager

/**
 * Panel de Stock Critico del administrador (HU-07, RF-11/RF-12).
 * El RBAC (solo rol ADMIN, RF-12 C2) se valida en dominio vía la sesión activa;
 * la UI solo oculta la entrada (defensa en profundidad, nunca seguridad sola en UI).
 * Devuelve los grupos donde el stock acumulado del grupo OEM ya igualó o bajó su punto
 * de reorden (RF-12 C1), ordenados por [OemStockGroup.stockTotal] ascendente
 * (los más urgentes primero).
 */
class ListCriticalStockGroups(
    private val repository: InventoryRepository,
    private val sessionManager: SessionManager
) {

    suspend operator fun invoke(): List<OemStockGroup> {
        requireAdmin()

        repository.ensureSeeded()
        return repository.stockAgrupadoPorOem()
            .filter { it.esCritico }
            .sortedBy { it.stockTotal }
    }

    /** El actor sale de la sesión activa (Gate por rol, RF-12 C2). */
    private suspend fun requireAdmin() {
        val session = sessionManager.currentSession() ?: throw InventoryError.SoloAdmin
        val rol = session.user.rol
        if (rol != UserRole.ADMIN) {
            throw InventoryError.SoloAdmin
        }
    }
}