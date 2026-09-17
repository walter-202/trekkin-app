package com.autopartes.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.OrderError
import com.autopartes.domain.model.PurchaseOrderDraft
import com.autopartes.domain.usecase.GeneratePurchaseOrder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado de la Sugerencia de OC (HU-08, RF-13). */
sealed interface PurchaseOrderUiState {
    data object Inicial : PurchaseOrderUiState

    data object Cargando : PurchaseOrderUiState

    data class Datos(val borrador: PurchaseOrderDraft) : PurchaseOrderUiState

    data class Error(val mensaje: String) : PurchaseOrderUiState
}

/**
 * Genera el borrador de OC (RF-13 C1/C2/C3). El RBAC (solo admin) lo resuelve
 * [GeneratePurchaseOrder] en dominio; la UI solo muestra el error si un rol no admin
 * llegara a montar la pantalla (defensa en profundidad).
 */
@HiltViewModel
class PurchaseOrderViewModel @Inject constructor(
    private val generatePurchaseOrder: GeneratePurchaseOrder
) : ViewModel() {

    private val _state = MutableStateFlow<PurchaseOrderUiState>(PurchaseOrderUiState.Inicial)
    val state: StateFlow<PurchaseOrderUiState> = _state.asStateFlow()

    fun generar() {
        viewModelScope.launch {
            _state.value = PurchaseOrderUiState.Cargando
            _state.value = try {
                PurchaseOrderUiState.Datos(generatePurchaseOrder())
            } catch (e: OrderError) {
                PurchaseOrderUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    fun reintentar() = generar()
}