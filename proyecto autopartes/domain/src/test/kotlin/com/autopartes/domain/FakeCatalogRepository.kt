package com.autopartes.domain

import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.model.OemPart
import com.autopartes.domain.model.ProductDetail
import com.autopartes.domain.repository.CatalogRepository

/** Catalogo fake en memoria para pruebas de dominio. */
class FakeCatalogRepository : CatalogRepository {

    private val datos = mutableMapOf<String, CatalogSummary>()
    private val detalles = mutableMapOf<String, ProductDetail>()
    var seeded = false

    fun agregar(summary: CatalogSummary) {
        datos[summary.oemPart.id] = summary
    }

    fun agregarDetalle(detail: ProductDetail) {
        detalles[detail.oemPart.id] = detail
    }

    override suspend fun ensureSeeded() {
        seeded = true
    }

    override suspend fun search(query: String): List<CatalogSummary> {
        val q = query.lowercase()
        return datos.values.filter {
            it.oemPart.nombreComun.lowercase().contains(q) ||
                it.oemPart.codigoOem.lowercase().contains(q)
        }
    }

    override suspend fun getDetail(oemId: String): ProductDetail? = detalles[oemId]
}

internal fun resumen(nombre: String, codigo: String, id: String): CatalogSummary =
    CatalogSummary(
        oemPart = OemPart(id = id, codigoOem = codigo, nombreComun = nombre, categoria = null, reorderPoint = 0),
        marcaMuestra = "Bosch",
        precioMuestra = 50.0
    )