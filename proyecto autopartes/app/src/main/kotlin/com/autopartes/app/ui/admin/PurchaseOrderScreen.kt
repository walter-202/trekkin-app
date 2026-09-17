package com.autopartes.app.ui.admin

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autopartes.app.ui.components.BannerMensaje
import com.autopartes.domain.model.PurchaseOrderDraft
import com.autopartes.domain.model.PurchaseOrderLine

/**
 * Sugerencia de Orden de Compra del admin (HU-08, RF-13). Un botón genera el borrador:
 * tarjeta del proveedor sugerido (RF-13 C1), líneas con stock actual y cantidad
 * requerida (RF-13 C2) y el badge de estado `borrador` (RF-13 C3). Solo se monta con
 * rol admin (Gate + RBAC en dominio: [GeneratePurchaseOrder]).
 */
@Composable
fun PurchaseOrderScreen(viewModel: PurchaseOrderViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Sugerencia de OC",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "Genera un borrador de orden de compra solo con los repuestos bajo su punto de reorden (RF-13).",
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(Modifier.height(16.dp))

        Button(
            onClick = viewModel::generar,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Generar borrador de OC")
        }

        Spacer(Modifier.height(16.dp))

        when (val current = state) {
            PurchaseOrderUiState.Inicial -> {
                Text(
                    text = "El sistema calculará la cantidad requerida (reorder_point − stock_actual) " +
                        "de cada repuesto bajo reorden y elegirá el proveedor.",
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            PurchaseOrderUiState.Cargando -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            is PurchaseOrderUiState.Error -> {
                BannerMensaje(current.mensaje)
                Spacer(Modifier.height(12.dp))
                Button(onClick = viewModel::reintentar) {
                    Text("Reintentar")
                }
            }

            is PurchaseOrderUiState.Datos -> {
                if (current.borrador.lineas.isEmpty()) {
                    Text(
                        text = "No hay repuestos bajo reorden para sugerir una OC.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    LazyColumn {
                        item(key = "proveedor") { SupplierCard(current.borrador) }
                        item(key = "titulo-lineas") {
                            Text(
                                text = "Repuestos a reabastecer",
                                modifier = Modifier.padding(top = 16.dp, bottom = 4.dp),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        items(current.borrador.lineas, key = { it.id }) { linea ->
                            LineaOCRow(linea)
                        }
                    }
                }
            }
        }
    }
}

/** Proveedor sugerido + estado del borrador (RF-13 C1 / C3). */
@Composable
private fun SupplierCard(borrador: PurchaseOrderDraft) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = "Proveedor sugerido",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = borrador.supplierNombre,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = "ESTADO: ${borrador.estado.uppercase()}",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }
    }
}

/** Línea del borrador: repuesto, stock actual y cantidad requerida (RF-13 C2). */
@Composable
private fun LineaOCRow(linea: PurchaseOrderLine) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = MaterialTheme.shapes.medium,
        tonalElevation = 2.dp
    ) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = linea.nombreComun,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Código OEM: ${linea.codigoOem}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "Stock actual: ${linea.stockActual}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.secondaryContainer
                ) {
                    Text(
                        text = "Necesario: ${linea.cantidadRequerida}",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }
        }
    }
}