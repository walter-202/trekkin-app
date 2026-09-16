package com.autopartes.data.local

import com.autopartes.data.local.entity.OemPartEntity
import com.autopartes.data.local.entity.PartVariantEntity

/**
 * Datos demo del catalogo (HU-04, RF-07). Solo se inserta si la coleccion esta vacia
 * (espejo de `routeSeed` de trekkin). En produccion la fuente es la API.
 */
object CatalogSeed {

    val oemParts: List<OemPartEntity> = listOf(
        OemPartEntity(id = "o-1", codigoOem = "04465-33490", nombreComun = "Pastillas de freno delanteras", categoria = "Frenos", reorderPoint = 10),
        OemPartEntity(id = "o-2", codigoOem = "90919-01250", nombreComun = "Bujía de encendido", categoria = "Motor", reorderPoint = 20),
        OemPartEntity(id = "o-3", codigoOem = "23300-0N250", nombreComun = "Filtro de aire", categoria = "Filtros", reorderPoint = 8),
        OemPartEntity(id = "o-4", codigoOem = "55210-60B00", nombreComun = "Pastillas de freno", categoria = "Frenos", reorderPoint = 12),
        OemPartEntity(id = "o-5", codigoOem = "16510-62J00", nombreComun = "Filtro de aire", categoria = "Filtros", reorderPoint = 6),
        OemPartEntity(id = "o-6", codigoOem = "40206-01DA2", nombreComun = "Pastillas de freno traseras", categoria = "Frenos", reorderPoint = 10)
    )

    val variants: List<PartVariantEntity> = listOf(
        PartVariantEntity(id = "v-1", oemPartId = "o-1", marcaFabricante = "Bosch", codigoFabricante = "BP341", nombreComercial = "Pastillas Bosch", precioUnitario = 120.0),
        PartVariantEntity(id = "v-2", oemPartId = "o-1", marcaFabricante = "Akebono", codigoFabricante = "AK-04465", nombreComercial = "Pastillas Akebono", precioUnitario = 98.0),
        PartVariantEntity(id = "v-3", oemPartId = "o-2", marcaFabricante = "Denso", codigoFabricante = "K20TT", nombreComercial = "Bujía Denso", precioUnitario = 22.0),
        PartVariantEntity(id = "v-4", oemPartId = "o-2", marcaFabricante = "NGK", codigoFabricante = "BKR6E-11", nombreComercial = "Bujía NGK", precioUnitario = 18.5),
        PartVariantEntity(id = "v-5", oemPartId = "o-3", marcaFabricante = "K&N", codigoFabricante = "33-2440", nombreComercial = "Filtro K&N", precioUnitario = 145.0),
        PartVariantEntity(id = "v-6", oemPartId = "o-3", marcaFabricante = "DENSO", codigoFabricante = "DN-23300", nombreComercial = "Filtro Denso", precioUnitario = 60.0),
        PartVariantEntity(id = "v-7", oemPartId = "o-4", marcaFabricante = "Bosch", codigoFabricante = "BP450", nombreComercial = "Pastillas Bosch", precioUnitario = 88.0),
        PartVariantEntity(id = "v-8", oemPartId = "o-4", marcaFabricante = "AISIN", codigoFabricante = "AIS-55210", nombreComercial = "Pastillas AISIN", precioUnitario = 75.0),
        PartVariantEntity(id = "v-9", oemPartId = "o-5", marcaFabricante = "MANN", codigoFabricante = "C27009", nombreComercial = "Filtro MANN", precioUnitario = 42.0),
        PartVariantEntity(id = "v-10", oemPartId = "o-6", marcaFabricante = "TRW", codigoFabricante = "GDB1558", nombreComercial = "Pastillas TRW", precioUnitario = 135.0)
    )
}