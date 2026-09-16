package com.autopartes.app.ui.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autopartes.app.ui.components.BannerMensaje
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole

/**
 * Panel de gestion de usuarios (HU-02, RF-04 C2). Solo se monta con rol admin (Gate).
 * Barra de busqueda por nombre/correo + filtros de rol y estado + listado.
 */
@Composable
fun UserManagementScreen(
    onOpen: (userId: String) -> Unit,
    viewModel: AdminViewModel
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var busqueda by rememberSaveable { mutableStateOf("") }
    var rolFiltro by rememberSaveable { mutableStateOf<UserRole?>(null) }
    var estadoFiltro by rememberSaveable { mutableStateOf<AccountStatus?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .padding(16.dp)
    ) {
        Text(
            text = "Gestión de Usuarios",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "Roles cliente/vendedor/admin y bloqueo de cuentas. Toda operación invalida el token del afectado (RF-04 C5).",
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = busqueda,
            onValueChange = {
                busqueda = it
                viewModel.cargar(it, rolFiltro, estadoFiltro)
            },
            placeholder = { Text("Busca por nombre o correo…") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(8.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = rolFiltro == null,
                onClick = {
                    rolFiltro = null
                    viewModel.cargar(busqueda, null, estadoFiltro)
                },
                label = { Text("Todos") }
            )
            UserRole.entries.forEach { rol ->
                FilterChip(
                    selected = rolFiltro == rol,
                    onClick = {
                        rolFiltro = rol
                        viewModel.cargar(busqueda, rol, estadoFiltro)
                    },
                    label = { Text(rol.etiqueta) }
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = estadoFiltro == null,
                onClick = {
                    estadoFiltro = null
                    viewModel.cargar(busqueda, rolFiltro, null)
                },
                label = { Text("Activos y bloqueados") }
            )
            FilterChip(
                selected = estadoFiltro == AccountStatus.ACTIVO,
                onClick = {
                    estadoFiltro = AccountStatus.ACTIVO
                    viewModel.cargar(busqueda, rolFiltro, AccountStatus.ACTIVO)
                },
                label = { Text("Activos") }
            )
            FilterChip(
                selected = estadoFiltro == AccountStatus.BLOQUEADO,
                onClick = {
                    estadoFiltro = AccountStatus.BLOQUEADO
                    viewModel.cargar(busqueda, rolFiltro, AccountStatus.BLOQUEADO)
                },
                label = { Text("Bloqueados") }
            )
        }

        Spacer(Modifier.height(16.dp))

        when (val current = state) {
            AdminUiState.Cargando -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            is AdminUiState.Error -> BannerMensaje(current.mensaje)

            is AdminUiState.Datos -> {
                current.mensaje?.let {
                    BannerMensaje(it)
                    Spacer(Modifier.height(12.dp))
                }

                if (current.usuarios.isEmpty()) {
                    Text(
                        text = "No hay usuarios que coincidan con la búsqueda.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    LazyColumn {
                        items(current.usuarios, key = { it.id }) { usuario ->
                            UserCard(user = usuario, onClick = { onOpen(usuario.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun UserCard(user: User, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = user.nombreCompleto,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            RolEtiqueta(rol = user.rol)
            Spacer(Modifier.padding(horizontal = 6.dp))
            EstadoEtiqueta(estado = user.estado)
        }
    }
}

@Composable
private fun RolEtiqueta(rol: UserRole) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.secondaryContainer
    ) {
        Text(
            text = rol.etiqueta,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSecondaryContainer
        )
    }
}

@Composable
private fun EstadoEtiqueta(estado: AccountStatus) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = if (estado == AccountStatus.BLOQUEADO)
            MaterialTheme.colorScheme.errorContainer
        else MaterialTheme.colorScheme.primaryContainer
    ) {
        Text(
            text = if (estado == AccountStatus.BLOQUEADO) "Bloqueado" else "Activo",
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = if (estado == AccountStatus.BLOQUEADO)
                MaterialTheme.colorScheme.onErrorContainer
            else MaterialTheme.colorScheme.onPrimaryContainer
        )
    }
}