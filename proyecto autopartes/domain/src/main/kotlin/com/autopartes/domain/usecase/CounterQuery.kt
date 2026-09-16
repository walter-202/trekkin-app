package com.autopartes.domain.usecase

import com.autopartes.domain.error.CounterError
import com.autopartes.domain.model.CounterHit
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.repository.InventoryRepository
import com.autopartes.domain.repository.SessionManager

/**
 * Consulta rápida del mostrador vendedor (HU-06, RF-10 C2/C3).
 * Solo rol VENDEDOR o ADMIN (RF-10 C1). La búsqueda es inmediata por teclado:
 * el vendedor escribe nombre común u OEM y se despliega el grupo con su stock.
 */
class CounterQuery(
    private val repository: InventoryRepository,
    private val sessionManager: SessionManager
) {

    suspend operator fun invoke(query: String): List<CounterHit> {
        requireVendedorOAdmin()

        val termino = query.trim()
        if (termino.isEmpty()) {
            throw CounterError.BusquedaInvalida("Escribe un término para buscar en el mostrador.")
        }

        repository.ensureSeeded()
        return repository.counterQuery(termino)
    }

    /** El actor sale de la sesión activa (Gate por rol, RF-10 C1). */
    private suspend fun requireVendedorOAdmin() {
        val session = sessionManager.currentSession() ?: throw CounterError.SoloVendedores
        val rol = session.user.rol
        if (rol != UserRole.VENDEDOR && rol != UserRole.ADMIN) {
            throw CounterError.SoloVendedores
        }
    }
}