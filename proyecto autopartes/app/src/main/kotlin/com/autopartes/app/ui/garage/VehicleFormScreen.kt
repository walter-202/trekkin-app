package com.autopartes.app.ui.garage

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.autopartes.app.ui.components.BannerMensaje
import com.autopartes.domain.model.Vehicle

/**
 * Formulario de alta/edición de vehículo (HU-03, RF-02 C1/C2).
 * Campos exactos: Marca, Modelo, Año, Cilindrada/Motor. SIN número de placa.
 */
@Composable
fun VehicleFormScreen(
    vehicle: Vehicle?,
    onSave: (marca: String, modelo: String, anio: Int, cilindradaMotor: String) -> Unit,
    onCancel: () -> Unit
) {
    var marca by rememberSaveable { mutableStateOf(vehicle?.marca ?: "") }
    var modelo by rememberSaveable { mutableStateOf(vehicle?.modelo ?: "") }
    var anio by rememberSaveable { mutableStateOf(vehicle?.anio?.toString() ?: "") }
    var cilindradaMotor by rememberSaveable { mutableStateOf(vehicle?.cilindradaMotor ?: "") }
    var errorLocal by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onCancel) { Text("← Garaje") }
        }

        Text(
            text = if (vehicle == null) "Agregar vehículo" else "Editar vehículo",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Solo datos del vehículo. La placa quedaría fuera del alcance V1.0 (RF-02 C1).",
            style = MaterialTheme.typography.bodyMedium
        )

        errorLocal?.let {
            Spacer(Modifier.height(12.dp))
            BannerMensaje(it)
        }

        Spacer(Modifier.height(20.dp))

        OutlinedTextField(
            value = marca,
            onValueChange = { marca = it },
            label = { Text("Marca (ej. Toyota)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = modelo,
            onValueChange = { modelo = it },
            label = { Text("Modelo (ej. Hilux)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = anio,
            onValueChange = { anio = it },
            label = { Text("Año (ej. 2018)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = cilindradaMotor,
            onValueChange = { cilindradaMotor = it },
            label = { Text("Cilindrada / Motor (ej. 2.7L 4 cil.)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = {
                val anioNum = anio.trim().toIntOrNull()
                errorLocal = if (anioNum == null) {
                    "El año debe ser un número válido."
                } else {
                    null
                }
                errorLocal?.let { return@Button }
                onSave(marca, modelo, anioNum, cilindradaMotor)
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (vehicle == null) "GUARDAR VEHÍCULO" else "GUARDAR CAMBIOS")
        }
    }
}