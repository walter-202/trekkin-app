package com.autopartes.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.InventoryError
import com.autopartes.domain.model.OemStockGroup
import com.autopartes.domain.usecase.ListCriticalStockGroups
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado del panel de Stock Critico (HU-07, RF-12 C2). */
sealed interface CriticalStockUiState {
    data object Cargando : CriticalStockUiState

    data class Datos(val grupos: List<OemStockGroup>) : CriticalStockUiState

    data class Error(val mensaje: String) : CriticalStockUiState
}

/**
 * Carga los grupos OEM criticos (stock acumulado <= punto de reorden). El RBAC
 * (solo admin, RF-12 C2) lo resuelve [ListCriticalStockGroups] en dominio; la UI solo
 * muestra el error si un rol no admin llegara a montar la pantalla (defensa en profundidad).
 */
@HiltViewModel
class CriticalStockViewModel @Inject constructor(
    private val listCriticalStockGroups: ListCriticalStockGroups
) : ViewModel() {

    private val _state = MutableStateFlow<CriticalStockUiState>(CriticalStockUiState.Cargando)
    val state: StateFlow<CriticalStockUiState> = _state.asStateFlow()

    init {
        cargar()
    }

    fun cargar() {
        viewModelScope.launch {
            _state.value = try {
                CriticalStockUiState.Datos(listCriticalStockGroups())
            } catch (e: InventoryError) {
                CriticalStockUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }
}