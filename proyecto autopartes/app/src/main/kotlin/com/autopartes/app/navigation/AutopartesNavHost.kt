package com.autopartes.app.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.autopartes.app.ui.auth.LoginScreen
import com.autopartes.app.ui.auth.RegisterScreen
import com.autopartes.app.ui.home.HomeScreen
import com.autopartes.app.ui.session.SessionUiState
import com.autopartes.app.ui.session.SessionViewModel

private object AuthRoutes {
    const val LOGIN = "login"
    const val REGISTER = "register"
}

/**
 * Gate de autenticacion (RF-01 C4 / RF-08).
 * Sin sesion -> flujo auth; con sesion -> pantalla principal del rol.
 * Las rutas por rol (catálogo HU-04, mostrador HU-06, admin HU-02) cuelgan aqui.
 */
@Composable
fun AutopartesNavHost(viewModel: SessionViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    when (val current = state) {
        SessionUiState.Cargando -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        is SessionUiState.ConSesion -> {
            HomeScreen(session = current.session, onLogout = viewModel::logout)
        }

        is SessionUiState.SinSesion -> {
            AuthNavHost(viewModel = viewModel, mensaje = current.mensaje)
        }
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