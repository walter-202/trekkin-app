package com.autopartes.domain.model

/**
 * Ficha técnica de un repuesto (HU-05, RF-08 C2).
 * Visión autenticada ([esCompleta] == true): variantes con precio + stock acumulado del
 * grupo OEM. Visita pública (false): solo resumen (sin variantes/precio/stock) +
 * invitación a login (RF-08 C1) — el [GetProductDetail] de dominio aplica este gate.
 */
data class ProductDetail(
    val oemPart: OemPart,
    val descripcion: String,
    val variantes: List<PartVariant>?,
    val stockTotal: Int?
) {
    /** El visitante sin sesión ve solo el resumen (RF-08 C1). */
    val esCompleta: Boolean get() = variantes != null && stockTotal != null
}