package com.autopartes.app.ui.admin

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

private object AdminRoutes {
    const val INICIO = "inicio"
    const val LISTA = "usuarios"
    const val DETALLE = "usuarios/{userId}"
    const val STOCK = "stock-critico"

    fun detalle(userId: String) = "usuarios/$userId"
}

/**
 * Navegación interna del panel de administración (HU-02 + HU-07): hub de módulos →
 * "Gestión de Usuarios" (lista → detalle) y "Stock Crítico" (RF-12 C2).
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

    NavHost(navController = navController, startDestination = AdminRoutes.INICIO) {
        composable(AdminRoutes.INICIO) {
            AdminHomeScreen(
                onOpenUsuarios = { navController.navigate(AdminRoutes.LISTA) },
                onOpenStock = { navController.navigate(AdminRoutes.STOCK) }
            )
        }
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
        composable(AdminRoutes.STOCK) {
            CriticalStockScreen()
        }
    }
}

/** Hub del panel de administración: entrada a los módulos Usuarios (HU-02) y Stock Crítico (HU-07). */
@Composable
private fun AdminHomeScreen(
    onOpenUsuarios: () -> Unit,
    onOpenStock: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Panel de Administración",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "Módulos de administración: usuarios (RF-04) y stock crítico por OEM (RF-12).",
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(Modifier.height(16.dp))

        AdminModuleCard(
            titulo = "Gestión de Usuarios",
            descripcion = "Roles, bloqueo/desbloqueo e invalidación de sesiones (HU-02).",
            onClick = onOpenUsuarios
        )
        Spacer(Modifier.height(12.dp))
        AdminModuleCard(
            titulo = "Stock Crítico",
            descripcion = "Inventario agrupado por OEM y alertas de punto de reorden (HU-07).",
            onClick = onOpenStock
        )
    }
}

@Composable
private fun AdminModuleCard(
    titulo: String,
    descripcion: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = titulo,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = descripcion,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}