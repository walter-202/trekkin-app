package com.autopartes.app.ui.counter

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.CounterError
import com.autopartes.domain.model.CounterHit
import com.autopartes.domain.usecase.CounterQuery
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado del mostrador vendedor (HU-06, RF-10). */
sealed interface CounterUiState {
    data object Inicial : CounterUiState
    data object Cargando : CounterUiState
    data class Resultado(val hits: List<CounterHit>) : CounterUiState
    data class Error(val mensaje: String) : CounterUiState
}

/**
 * Consulta rápida con debounce (300ms) para sentirla instantánea al teclear (RF-10 C2).
 * El RBAC (vendedor/admin) lo aplica [CounterQuery] en dominio (RF-10 C1); la UI solo
 * muestra el error si un rol no vendedor llegara a montar la pantalla.
 */
@HiltViewModel
class CounterViewModel @Inject constructor(
    private val counterQuery: CounterQuery
) : ViewModel() {

    private val _state = MutableStateFlow<CounterUiState>(CounterUiState.Inicial)
    val state: StateFlow<CounterUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(query: String) {
        searchJob?.cancel()
        if (query.isBlank()) {
            _state.value = CounterUiState.Inicial
            return
        }
        _state.value = CounterUiState.Cargando
        searchJob = viewModelScope.launch {
            delay(300)
            _state.value = try {
                val hits = counterQuery(query)
                if (hits.isEmpty()) CounterUiState.Error("No se encontraron resultados en el mostrador para «$query».")
                else CounterUiState.Resultado(hits)
            } catch (e: CounterError) {
                CounterUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }
}