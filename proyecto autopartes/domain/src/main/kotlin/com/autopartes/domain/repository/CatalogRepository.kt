package com.autopartes.domain.repository

import com.autopartes.domain.model.CatalogSummary

/**
 * Puerto de catalogo publico (HU-04, RF-06/RF-07). Accesible por visitantes sin sesion.
 * El filtro por garaje/vehiculo activo llega con HU-03 (RF-05).
 */
interface CatalogRepository {

    /** Carga datos demo si el catalogo esta vacio (seed local, espejo de routeSeed de trekkin). */
    suspend fun ensureSeeded()

    /**
     * Busca por nombre comun o codigo OEM (RF-06 C1).
     * La implementacion consulta ambas vias (codigo_oem + nombre_comun) y deduplica.
     */
    suspend fun search(query: String): List<CatalogSummary>
}