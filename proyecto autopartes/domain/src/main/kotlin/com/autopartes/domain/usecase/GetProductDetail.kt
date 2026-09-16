package com.autopartes.domain.usecase

import com.autopartes.domain.error.CatalogError
import com.autopartes.domain.model.ProductDetail
import com.autopartes.domain.repository.CatalogRepository
import com.autopartes.domain.repository.SessionManager

/**
 * Ficha técnica del repuesto (HU-05, RF-08/RF-09).
 * Gate RF-08 C1 en dominio: con sesión activa devuelve la ficha completa (variantes,
 * precio y stock acumulado del grupo OEM); sin sesión devuelve solo el resumen
 * (sin variantes/precio/stock), y la UI invita a iniciar sesión.
 */
class GetProductDetail(
    private val repository: CatalogRepository,
    private val sessionManager: SessionManager
) {

    suspend operator fun invoke(oemId: String): ProductDetail {
        val detalle = repository.getDetail(oemId)
            ?: throw CatalogError.ProductoNoEncontrado

        return if (sessionManager.currentSession() != null) {
            detalle
        } else {
            detalle.copy(variantes = null, stockTotal = null)
        }
    }
}