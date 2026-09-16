package com.autopartes.app.ui.garage

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

private object GarageRoutes {
    const val LISTA = "garaje"
    const val AGREGAR = "garaje/nuevo"
    const val EDITAR = "garaje/editar/{vehicleId}"

    fun editar(vehicleId: String) = "garaje/editar/$vehicleId"
}

/**
 * Navegación interna del Garaje Virtual (HU-03): lista → alta → edición.
 * Solo se monta desde una sesión activa (Gate, tab Cuenta).
 */
@Composable
fun GarageNavHost(
    onExitGarage: () -> Unit,
    viewModel: GarageViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val state by viewModel.state.collectAsStateWithLifecycle()

    NavHost(navController = navController, startDestination = GarageRoutes.LISTA) {
        composable(GarageRoutes.LISTA) {
            GarageListScreen(
                viewModel = viewModel,
                onBack = onExitGarage,
                onAdd = { navController.navigate(GarageRoutes.AGREGAR) },
                onEdit = { navController.navigate(GarageRoutes.editar(it)) }
            )
        }
        composable(GarageRoutes.AGREGAR) {
            VehicleFormScreen(
                vehicle = null,
                onSave = { marca, modelo, anio, cilindrada ->
                    viewModel.crear(marca, modelo, anio, cilindrada)
                    navController.popBackStack()
                },
                onCancel = { navController.popBackStack() }
            )
        }
        composable(GarageRoutes.EDITAR) { entry ->
            val vehicleId = entry.arguments?.getString("vehicleId")
            val vehicle = (state as? GarageUiState.Datos)
                ?.vehicles?.firstOrNull { it.id == vehicleId }
            VehicleFormScreen(
                vehicle = vehicle,
                onSave = { marca, modelo, anio, cilindrada ->
                    vehicleId?.let { id ->
                        viewModel.editar(id, marca, modelo, anio, cilindrada)
                    }
                    navController.popBackStack()
                },
                onCancel = { navController.popBackStack() }
            )
        }
    }
}