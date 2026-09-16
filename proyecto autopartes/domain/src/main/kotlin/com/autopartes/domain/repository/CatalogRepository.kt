package com.autopartes.domain.repository

import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.model.ProductDetail

/**
 * Puerto de catalogo publico (HU-04, RF-06/RF-07) y ficha tecnica (HU-05, RF-08/RF-09).
 * Accesible por visitantes sin sesion; el gate del detalle completo lo aplica
 * `GetProductDetail` en dominio (RF-08 C1).
 */
interface CatalogRepository {

    /** Carga datos demo si el catalogo esta vacio (seed local, espejo de routeSeed de trekkin). */
    suspend fun ensureSeeded()

    /**
     * Busca por nombre comun o codigo OEM (RF-06 C1).
     * La implementacion consulta ambas vias (codigo_oem + nombre_comun) y deduplica.
     */
    suspend fun search(query: String): List<CatalogSummary>

    /**
     * Detalle factual del grupo OEM (RF-08 C2): descripcion, variantes con precio y
     * stock acumulado de todas sus variantes. Devuelve null si el id no existe.
     */
    suspend fun getDetail(oemId: String): ProductDetail?
}