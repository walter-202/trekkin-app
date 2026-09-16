package com.autopartes.app.ui.garage

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.GarageError
import com.autopartes.domain.model.Vehicle
import com.autopartes.domain.usecase.GetCurrentSession
import com.autopartes.domain.usecase.ListMyVehicles
import com.autopartes.domain.usecase.RegisterVehicle
import com.autopartes.domain.usecase.SetActiveVehicle
import com.autopartes.domain.usecase.UpdateVehicle
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado del Garaje Virtual (HU-03). */
sealed interface GarageUiState {
    data object Cargando : GarageUiState
    data class Datos(
        val vehicles: List<Vehicle>,
        val mensaje: String? = null
    ) : GarageUiState

    data class Error(val mensaje: String) : GarageUiState
}

/**
 * Orquesta los casos de uso del garaje (RF-02/RF-03). Las pantallas solo ven
 * [GarageUiState]; el userId sale de la sesion activa via GetCurrentSession.
 */
@HiltViewModel
class GarageViewModel @Inject constructor(
    private val getCurrentSession: GetCurrentSession,
    private val listMyVehicles: ListMyVehicles,
    private val registerVehicle: RegisterVehicle,
    private val updateVehicle: UpdateVehicle,
    private val setActiveVehicle: SetActiveVehicle
) : ViewModel() {

    private val _state = MutableStateFlow<GarageUiState>(GarageUiState.Cargando)
    val state: StateFlow<GarageUiState> = _state.asStateFlow()

    private var userId: String? = null

    init {
        viewModelScope.launch {
            userId = getCurrentSession()?.user?.id
            cargar()
        }
    }

    fun cargar() {
        viewModelScope.launch {
            val uid = userId ?: run {
                _state.value = GarageUiState.Datos(vehicles = emptyList())
                return@launch
            }
            _state.value = try {
                GarageUiState.Datos(vehicles = listMyVehicles(uid))
            } catch (e: GarageError) {
                GarageUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    fun crear(marca: String, modelo: String, anio: Int, cilindradaMotor: String) {
        viewModelScope.launch {
            val uid = userId ?: return@launch
            try {
                registerVehicle(uid, marca, modelo, anio, cilindradaMotor)
                _state.value = GarageUiState.Datos(
                    vehicles = listMyVehicles(uid),
                    mensaje = "Vehículo registrado en tu garaje."
                )
            } catch (e: GarageError) {
                _state.value = GarageUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    fun editar(vehicleId: String, marca: String, modelo: String, anio: Int, cilindradaMotor: String) {
        viewModelScope.launch {
            val uid = userId ?: return@launch
            try {
                updateVehicle(uid, vehicleId, marca, modelo, anio, cilindradaMotor)
                _state.value = GarageUiState.Datos(
                    vehicles = listMyVehicles(uid),
                    mensaje = "Vehículo actualizado."
                )
            } catch (e: GarageError) {
                _state.value = GarageUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    fun activar(vehicleId: String) {
        viewModelScope.launch {
            val uid = userId ?: return@launch
            try {
                setActiveVehicle(uid, vehicleId)
                _state.value = GarageUiState.Datos(
                    vehicles = listMyVehicles(uid),
                    mensaje = "Vehículo activo actualizado. El catálogo se filtra por él."
                )
            } catch (e: GarageError) {
                _state.value = GarageUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    fun limpiarMensaje() {
        val current = _state.value
        if (current is GarageUiState.Datos && current.mensaje != null) {
            _state.value = current.copy(mensaje = null)
        }
    }
}