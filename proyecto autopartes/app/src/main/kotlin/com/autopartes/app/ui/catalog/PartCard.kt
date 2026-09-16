package com.autopartes.app.ui.catalog

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.model.OemPart

/**
 * Tarjeta resumen del catalogo (RF-07 C1): imagen (placeholder), nombre, marca, precio y
 * codigo OEM. Al tocar abre la ficha técnica (HU-05, RF-08). Imagenes reales llegan con
 * la API (V2); el placeholder usa iniciales.
 */
@Composable
fun PartCard(summary: CatalogSummary, onClick: () -> Unit = {}) {
    val part = summary.oemPart

    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = MaterialTheme.shapes.medium,
        tonalElevation = 2.dp
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.secondaryContainer
            ) {
                Text(
                    text = part.nombreComun.take(2).uppercase(),
                    modifier = Modifier.padding(8.dp),
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.width(12.dp))

            Column {
                Text(
                    text = part.nombreComun,
                    style = MaterialTheme.typography.titleMedium
                )
                summary.marcaMuestra?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Código OEM: ${part.codigoOem}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                summary.precioMuestra?.let {
                    Text(
                        text = "Precio: ${"%.2f".format(it)}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

internal val sample = CatalogSummary(
    oemPart = OemPart(
        id = "o-demo",
        codigoOem = "04465-33490",
        nombreComun = "Pastillas de freno delanteras",
        categoria = "Frenos",
        reorderPoint = 10
    ),
    marcaMuestra = "Bosch",
    precioMuestra = 98.0
)