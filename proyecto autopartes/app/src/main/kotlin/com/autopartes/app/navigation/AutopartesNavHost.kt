package com.autopartes.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.autopartes.app.ui.auth.LoginScreen
import com.autopartes.app.ui.auth.RegisterScreen
import com.autopartes.app.ui.admin.AdminNavHost
import com.autopartes.app.ui.catalog.CatalogScreen
import com.autopartes.app.ui.components.MainTab
import com.autopartes.app.ui.components.MainTabs
import com.autopartes.app.ui.counter.CounterScreen
import com.autopartes.app.ui.garage.GarageNavHost
import com.autopartes.app.ui.home.HomeScreen
import com.autopartes.app.ui.session.SessionUiState
import com.autopartes.app.ui.session.SessionViewModel
import com.autopartes.domain.model.UserRole

private object AuthRoutes {
    const val LOGIN = "login"
    const val REGISTER = "register"
}

/**
 * Gate de autenticacion (RF-01 C4 / RF-08).
 * - Catalogo: publico, sin sesion (RF-07; el detalle completo exige login en HU-05).
 * - Cuenta: con sesion -> HomeScreen; sin sesion -> flujo Login/Registro.
 * - Mostrador (HU-06) y Usuarios (HU-02): tabs por rol cuelgan de este Gate.
 */
@Composable
fun AutopartesNavHost(viewModel: SessionViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableStateOf(MainTab.CATALOGO) }

    val rol = (state as? SessionUiState.ConSesion)?.session?.user?.rol
    val esAdmin = rol == UserRole.ADMIN
    val esVendedorOAdmin = rol == UserRole.VENDEDOR || rol == UserRole.ADMIN

    Column(Modifier.fillMaxSize()) {
        MainTabs(
            selected = tab,
            onSelect = { tab = it },
            showAdmin = esAdmin,
            showMostrador = esVendedorOAdmin
        )

        ContentArea(
            tab = tab,
            state = state,
            viewModel = viewModel,
            onTabSelect = { tab = it }
        )
    }
}

@Composable
private fun ContentArea(
    tab: MainTab,
    state: SessionUiState,
    viewModel: SessionViewModel,
    onTabSelect: (MainTab) -> Unit
) {
    when (tab) {
        MainTab.CATALOGO -> CatalogScreen(
            sesionActiva = state is SessionUiState.ConSesion,
            onOpenLogin = { onTabSelect(MainTab.CUENTA) }
        )

        MainTab.MOSTRADOR -> when (state) {
            is SessionUiState.ConSesion ->
                if (state.session.user.rol == UserRole.VENDEDOR ||
                    state.session.user.rol == UserRole.ADMIN
                ) {
                    CounterScreen()
                } else {
                    CatalogScreen(
                        sesionActiva = true,
                        onOpenLogin = { onTabSelect(MainTab.CUENTA) }
                    )
                }

            else -> CatalogScreen(
                sesionActiva = false,
                onOpenLogin = { onTabSelect(MainTab.CUENTA) }
            )
        }

        MainTab.USUARIOS -> when (state) {
            is SessionUiState.ConSesion ->
                if (state.session.user.rol == UserRole.ADMIN) {
                    AdminNavHost(onKick = viewModel::revalidar)
                } else {
                    CatalogScreen(
                        sesionActiva = true,
                        onOpenLogin = { onTabSelect(MainTab.CUENTA) }
                    )
                }

            else -> CatalogScreen(
                sesionActiva = false,
                onOpenLogin = { onTabSelect(MainTab.CUENTA) }
            )
        }

        MainTab.CUENTA -> when (state) {
            SessionUiState.Cargando -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            is SessionUiState.ConSesion -> AccountNavHost(
                state = state,
                viewModel = viewModel
            )

            is SessionUiState.SinSesion -> AuthNavHost(
                viewModel = viewModel,
                mensaje = state.mensaje
            )
        }
    }
}

/**
 * Area autenticada de la pestaña Cuenta (RF-01 C4): perfil + garaje virtual (HU-03).
 * El garaje solo se muestra con sesión (Gate); el catálogo es público.
 */
@Composable
private fun AccountNavHost(state: SessionUiState.ConSesion, viewModel: SessionViewModel) {
    var inGarage by rememberSaveable { mutableStateOf(false) }

    if (inGarage) {
        GarageNavHost(onExitGarage = { inGarage = false })
    } else {
        HomeScreen(
            session = state.session,
            onLogout = viewModel::logout,
            onOpenGarage = { inGarage = true }
        )
    }
}

@Composable
private fun AuthNavHost(viewModel: SessionViewModel, mensaje: String?) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = AuthRoutes.LOGIN) {
        composable(AuthRoutes.LOGIN) {
            LoginScreen(
                mensaje = mensaje,
                onLogin = viewModel::login,
                onNavigateToRegister = { navController.navigate(AuthRoutes.REGISTER) }
            )
        }
        composable(AuthRoutes.REGISTER) {
            RegisterScreen(
                mensaje = mensaje,
                onRegister = viewModel::register,
                onNavigateToLogin = { navController.popBackStack() }
            )
        }
    }
}