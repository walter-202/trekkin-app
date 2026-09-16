package com.autopartes.app.ui.garage

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autopartes.app.ui.components.BannerMensaje
import com.autopartes.domain.model.Vehicle

/**
 * Listado del Garaje Virtual (HU-03, RF-02 C2). Muestra los vehículos del usuario,
 * cuál es el activo, y permite activar otro (RF-03) o editar (RF-02 C2).
 */
@Composable
fun GarageListScreen(
    onBack: () -> Unit,
    onAdd: () -> Unit,
    onEdit: (vehicleId: String) -> Unit,
    viewModel: GarageViewModel
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onBack) { Text("← Cuenta") }
        }

        Text(
            text = "Mi garaje",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "Registra tus vehículos sin número de placa (RF-02). El activo filtra el catálogo.",
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(Modifier.height(16.dp))

        when (val current = state) {
            GarageUiState.Cargando -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            is GarageUiState.Error -> BannerMensaje(current.mensaje)

            is GarageUiState.Datos -> {
                current.mensaje?.let {
                    BannerMensaje(it)
                    Spacer(Modifier.height(12.dp))
                }

                if (current.vehicles.isEmpty()) {
                    Text(
                        text = "Aún no tienes vehículos. Agrega el primero: quedará como activo.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    LazyColumn {
                        items(current.vehicles, key = { it.id }) { vehicle ->
                            VehicleRow(
                                vehicle = vehicle,
                                onSetActive = { viewModel.activar(vehicle.id) },
                                onEdit = { onEdit(vehicle.id) }
                            )
                            HorizontalDivider()
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onAdd,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("AGREGAR VEHÍCULO")
                }
            }
        }
    }
}

@Composable
private fun VehicleRow(
    vehicle: Vehicle,
    onSetActive: () -> Unit,
    onEdit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onEdit)
            .padding(vertical = 12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "${vehicle.marca} ${vehicle.modelo}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            if (vehicle.esActivo) {
                Spacer(Modifier.padding(horizontal = 8.dp))
                Surface(
                    shape = MaterialTheme.shapes.small,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = "Activo",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }
        Text(
            text = "${vehicle.anio} · ${vehicle.cilindradaMotor}",
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.height(8.dp))

        if (!vehicle.esActivo) {
            OutlinedButton(onClick = onSetActive) {
                Text("Usar como activo")
            }
        }
    }
}