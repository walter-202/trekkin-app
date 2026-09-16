package com.autopartes.app.ui.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.CatalogError
import com.autopartes.domain.model.CatalogSummary
import com.autopartes.domain.usecase.SearchCatalog
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado del catalogo (HU-04). */
sealed interface CatalogUiState {
    data object Inicial : CatalogUiState
    data object Cargando : CatalogUiState
    data class Resultado(val items: List<CatalogSummary>) : CatalogUiState
    data class Error(val mensaje: String) : CatalogUiState
}

/**
 * Busqueda con debounce (300ms) para sentirla rapida en teclado (RF-06, RNF-02).
 * Publico: no exige sesion (el gate de detalle es HU-05).
 */
@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val searchCatalog: SearchCatalog
) : ViewModel() {

    private val _state = MutableStateFlow<CatalogUiState>(CatalogUiState.Inicial)
    val state: StateFlow<CatalogUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(query: String) {
        searchJob?.cancel()
        if (query.isBlank()) {
            _state.value = CatalogUiState.Inicial
            return
        }
        _state.value = CatalogUiState.Cargando
        searchJob = viewModelScope.launch {
            delay(300)
            _state.value = try {
                val items = searchCatalog(query)
                if (items.isEmpty()) CatalogUiState.Error("No se encontraron resultados para «$query».")
                else CatalogUiState.Resultado(items)
            } catch (e: CatalogError) {
                CatalogUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }
}