package com.autopartes.app.ui.catalog

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autopartes.app.ui.components.BannerMensaje

/**
 * Pantalla publica de catalogo y busqueda (HU-04, RF-06/RF-07).
 * Accesible sin sesion; la ficha técnica (detalle/precio/stock) exige login en HU-05.
 */
@Composable
fun CatalogScreen(viewModel: CatalogViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .padding(16.dp)
    ) {
        Text(
            text = "Catálogo de repuestos",
            style = MaterialTheme.typography.headlineSmall
        )
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                viewModel.onQueryChange(it)
            },
            placeholder = { Text("Busca por nombre o código OEM…") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        when (val current = state) {
            CatalogUiState.Inicial -> {
                Text(
                    text = "Ingresa un nombre común (ej. «pastillas de freno») o un código OEM (ej. 04465-33490).",
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            CatalogUiState.Cargando -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            is CatalogUiState.Error -> {
                BannerMensaje(current.mensaje)
            }

            is CatalogUiState.Resultado -> {
                LazyColumn {
                    items(current.items, key = { it.oemPart.id }) { item ->
                        PartCard(item)
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun CatalogScreenPreview() {
    MaterialTheme {
        Column(Modifier.padding(16.dp)) {
            PartCard(sample)
        }
    }
}