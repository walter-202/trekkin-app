package com.autopartes.app.ui.admin

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

private object AdminRoutes {
    const val LISTA = "usuarios"
    const val DETALLE = "usuarios/{userId}"

    fun detalle(userId: String) = "usuarios/$userId"
}

/**
 * Navegación interna del panel de administración (HU-02): lista → detalle.
 * Solo se monta desde una sesión con rol admin (Gate, RF-04 C1).
 * [onKick] rehidrata la sesión tras operar sobre la propia cuenta (RF-04 C5).
 */
@Composable
fun AdminNavHost(
    onKick: () -> Unit,
    viewModel: AdminViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val state by viewModel.state.collectAsStateWithLifecycle()

    NavHost(navController = navController, startDestination = AdminRoutes.LISTA) {
        composable(AdminRoutes.LISTA) {
            UserManagementScreen(
                viewModel = viewModel,
                onOpen = { navController.navigate(AdminRoutes.detalle(it)) }
            )
        }
        composable(AdminRoutes.DETALLE) { entry ->
            val userId = entry.arguments?.getString("userId")
            val user = (state as? AdminUiState.Datos)
                ?.usuarios?.firstOrNull { it.id == userId }
            if (user == null) {
                UserManagementScreen(
                    viewModel = viewModel,
                    onOpen = { navController.navigate(AdminRoutes.detalle(it)) }
                )
            } else {
                UserDetailScreen(
                    user = user,
                    onBack = { navController.popBackStack() },
                    viewModel = viewModel,
                    onSelfChanged = onKick
                )
            }
        }
    }
}