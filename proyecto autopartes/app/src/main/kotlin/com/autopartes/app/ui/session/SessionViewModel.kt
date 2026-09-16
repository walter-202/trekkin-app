package com.autopartes.app.ui.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopartes.domain.error.AuthError
import com.autopartes.domain.model.UserSession
import com.autopartes.domain.usecase.GetCurrentSession
import com.autopartes.domain.usecase.LoginUser
import com.autopartes.domain.usecase.LogoutUser
import com.autopartes.domain.usecase.RegisterUser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Estado del Gate de autenticacion (RF-01 C4). */
sealed interface SessionUiState {
    data object Cargando : SessionUiState
    data class SinSesion(val mensaje: String? = null) : SessionUiState
    data class ConSesion(val session: UserSession) : SessionUiState
}

/**
 * Orquesta los casos de uso de HU-01. La UI solo ve [SessionUiState]
 * y nunca importa datos ni firebase/infrastructure internos.
 */
@HiltViewModel
class SessionViewModel @Inject constructor(
    private val registerUser: RegisterUser,
    private val loginUser: LoginUser,
    private val logoutUser: LogoutUser,
    private val getCurrentSession: GetCurrentSession
) : ViewModel() {

    private val _state = MutableStateFlow<SessionUiState>(SessionUiState.Cargando)
    val state: StateFlow<SessionUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val session = getCurrentSession()
            _state.value = session?.let { SessionUiState.ConSesion(it) }
                ?: SessionUiState.SinSesion()
        }
    }

    fun register(nombreCompleto: String, email: String, password: String) {
        viewModelScope.launch {
            _state.value = try {
                registerUser(nombreCompleto, email, password)
                SessionUiState.SinSesion("¡Cuenta creada exitosamente! Inicia sesión.")
            } catch (e: AuthError) {
                SessionUiState.SinSesion(e.message ?: "Error inesperado")
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _state.value = try {
                SessionUiState.ConSesion(loginUser(email, password))
            } catch (e: AuthError) {
                SessionUiState.SinSesion(e.message ?: "Error inesperado")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            logoutUser()
            _state.value = SessionUiState.SinSesion()
        }
    }

    /**
     * Rehidrata la sesion contra la base (RF-04 C5, HU-02): tras una operacion del admin
     * (cambio de rol o bloqueo) [GetCurrentSession] revalida tokenVersion/estado y, si la
     * sesion quedo invalida (kick en vivo), deriva a SinSesion.
     */
    fun revalidar() {
        viewModelScope.launch {
            val session = getCurrentSession()
            _state.value = session?.let { SessionUiState.ConSesion(it) }
                ?: SessionUiState.SinSesion("Tu sesión fue invalidada por el administrador.")
        }
    }
}