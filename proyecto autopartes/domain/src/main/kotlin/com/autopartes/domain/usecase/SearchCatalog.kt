package com.autopartes.domain.usecase

import com.autopartes.domain.error.CatalogError
import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.repository.CatalogRepository

/**
 * Busqueda en el catalogo (HU-04, RF-06). Valida el termino en el dominio y delega
 * en el puerto [CatalogRepository]. Publico: no exige sesion (RF-07, gate en HU-05).
 *
 * @param compatibleOemIds ids de oem_parts compatibles con el vehiculo activo (HU-03,
 * RF-05 C2). null = sin filtro por garaje.
 */
class SearchCatalog(private val repository: CatalogRepository) {

    suspend operator fun invoke(
        query: String,
        compatibleOemIds: Set<String>? = null
    ): List<CatalogSummary> {
        val termino = query.trim()
        if (termino.length < 1) {
            throw CatalogError.BusquedaInvalida("Escribe un término de búsqueda.")
        }

        repository.ensureSeeded()
        val resultados = repository.search(termino)
        return if (compatibleOemIds == null) {
            resultados
        } else {
            resultados.filter { it.oemPart.id in compatibleOemIds }
        }
    }
}