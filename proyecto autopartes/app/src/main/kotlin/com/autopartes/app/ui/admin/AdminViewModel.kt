package com.autopartes.app.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.AdminError
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole
import com.autopartes.domain.usecase.AssignRole
import com.autopartes.domain.usecase.GetCurrentSession
import com.autopartes.domain.usecase.ListUsers
import com.autopartes.domain.usecase.SetAccountStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado del panel de administracion de usuarios (HU-02, RF-04). */
sealed interface AdminUiState {
    data object Cargando : AdminUiState

    data class Datos(
        val usuarios: List<User>,
        val busqueda: String = "",
        val rolFiltro: UserRole? = null,
        val estadoFiltro: AccountStatus? = null,
        val mensaje: String? = null
    ) : AdminUiState

    data class Error(val mensaje: String) : AdminUiState
}

/**
 * Orquesta los casos de uso del panel admin (RF-04). La UI solo ve [AdminUiState];
 * el actor (admin) lo resuelven los usecases via la sesion activa.
 */
@HiltViewModel
class AdminViewModel @Inject constructor(
    private val getCurrentSession: GetCurrentSession,
    private val listUsers: ListUsers,
    private val assignRole: AssignRole,
    private val setAccountStatus: SetAccountStatus
) : ViewModel() {

    private val _state = MutableStateFlow<AdminUiState>(AdminUiState.Cargando)
    val state: StateFlow<AdminUiState> = _state.asStateFlow()

    private var selfId: String? = null

    init {
        viewModelScope.launch {
            selfId = getCurrentSession()?.user?.id
            cargar()
        }
    }

    fun cargar(busqueda: String = "", rol: UserRole? = null, estado: AccountStatus? = null) {
        viewModelScope.launch {
            _state.value = try {
                AdminUiState.Datos(
                    usuarios = listUsers(busqueda, rol, estado),
                    busqueda = busqueda,
                    rolFiltro = rol,
                    estadoFiltro = estado
                )
            } catch (e: AdminError) {
                AdminUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    fun cambiarRol(userId: String, nuevoRol: UserRole, onKick: () -> Unit) {
        viewModelScope.launch {
            _state.value = try {
                assignRole(userId, nuevoRol)
                val mensaje = if (userId == selfId) {
                    onKick()
                    "Tu rol cambió a ${nuevoRol.etiqueta}. La sesión fue invalidada (RF-04 C5)."
                } else {
                    "Rol actualizado a ${nuevoRol.etiqueta}."
                }
                AdminUiState.Datos(usuarios = listarUsuarios(), mensaje = mensaje)
            } catch (e: AdminError) {
                AdminUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    fun setEstado(userId: String, bloqueado: Boolean, onKick: () -> Unit) {
        viewModelScope.launch {
            _state.value = try {
                setAccountStatus(
                    userId,
                    if (bloqueado) AccountStatus.BLOQUEADO else AccountStatus.ACTIVO
                )
                val mensaje = if (userId == selfId) {
                    onKick()
                    if (bloqueado) "Te bloqueaste. La sesión fue invalidada (RF-04 C5)."
                    else "Tu cuenta fue desbloqueada."
                } else {
                    if (bloqueado) "Cuenta bloqueada. Token invalidado (RF-04 C5)."
                    else "Cuenta desbloqueada."
                }
                AdminUiState.Datos(usuarios = listarUsuarios(), mensaje = mensaje)
            } catch (e: AdminError) {
                AdminUiState.Error(e.message ?: "Error inesperado")
            }
        }
    }

    /**
     * Lista usuarios tras una operación. Si la operación derribó al propio admin
     * (kick en vivo), la relista falla por RBAC y se devuelve lista vacía: la sesión
     * ya fue invalidada por [onKick] y el Gate sacará al usuario.
     */
    private suspend fun listarUsuarios(): List<User> =
        try {
            listUsers()
        } catch (_: AdminError) {
            emptyList()
        }

    fun limpiarMensaje() {
        val current = _state.value
        if (current is AdminUiState.Datos && current.mensaje != null) {
            _state.value = current.copy(mensaje = null)
        }
    }
}