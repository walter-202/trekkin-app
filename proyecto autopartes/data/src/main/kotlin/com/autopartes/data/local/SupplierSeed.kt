package com.autopartes.data.local

import com.autopartes.data.local.entity.SupplierEntity

/**
 * Proveedores demo de la Sugerencia de OC (HU-08, RF-13). Solo se insertan si la tabla
 * `suppliers` está vacía. Los nombres matchean por marca con los fabricantes del
 * [CatalogSeed] (Bosch/Denso/TRW…) para que la heurística de [PurchaseOrderRepositoryImpl]
 * elija un proveedor coherente (RF-13 C1).
 */
object SupplierSeed {

    val suppliers: List<SupplierEntity> = listOf(
        SupplierEntity(
            id = "sup-s1",
            nombre = "Bosch Bolivia SRL",
            telefono = "+591 2 244-0100",
            email = "pedidos@boschbolivia.bo"
        ),
        SupplierEntity(
            id = "sup-s2",
            nombre = "Denso Andina SA",
            telefono = "+591 2 244-0200",
            email = "ventas@densoandina.bo"
        ),
        SupplierEntity(
            id = "sup-s3",
            nombre = "TRW Gómez Autopartes",
            telefono = "+591 3 337-0300",
            email = "trw@autopartesgomez.bo"
        )
    )
}