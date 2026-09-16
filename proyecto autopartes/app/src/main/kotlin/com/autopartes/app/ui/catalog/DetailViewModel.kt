package com.autopartes.app.ui.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.CatalogError
import com.autopartes.domain.model.ProductDetail
import com.autopartes.domain.usecase.GetProductDetail
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado de la ficha técnica (HU-05, RF-08). */
sealed interface DetailUiState {
    data object Cargando : DetailUiState
    data class Resultado(val detail: ProductDetail) : DetailUiState
    data class Error(val mensaje: String) : DetailUiState
}

/**
 * Carga el detalle del grupo OEM vía [GetProductDetail]; el Gate RF-08 (ficha completa
 * solo con sesión) lo resuelve el use case de dominio, la UI solo lo presenta.
 */
@HiltViewModel
class DetailViewModel @Inject constructor(
    private val getProductDetail: GetProductDetail
) : ViewModel() {

    private val _state = MutableStateFlow<DetailUiState>(DetailUiState.Cargando)
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    fun load(oemId: String) {
        if (_state.value is DetailUiState.Resultado &&
            (_state.value as DetailUiState.Resultado).detail.oemPart.id == oemId
        ) return

        _state.value = DetailUiState.Cargando
        viewModelScope.launch {
            _state.value = try {
                DetailUiState.Resultado(getProductDetail(oemId))
            } catch (e: CatalogError) {
                DetailUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }
}