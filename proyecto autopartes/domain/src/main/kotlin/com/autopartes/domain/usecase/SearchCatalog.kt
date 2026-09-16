package com.autopartes.domain.usecase

import com.autopartes.domain.error.CatalogError
import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.repository.CatalogRepository

/**
 * Busqueda en el catalogo (HU-04, RF-06). Valida el termino en el dominio y delega
 * en el puerto [CatalogRepository]. Publico: no exige sesion (RF-07, gate en HU-05).
 */
class SearchCatalog(private val repository: CatalogRepository) {

    suspend operator fun invoke(query: String): List<CatalogSummary> {
        val termino = query.trim()
        if (termino.length < 1) {
            throw CatalogError.BusquedaInvalida("Escribe un término de búsqueda.")
        }

        repository.ensureSeeded()
        return repository.search(termino)
    }
}