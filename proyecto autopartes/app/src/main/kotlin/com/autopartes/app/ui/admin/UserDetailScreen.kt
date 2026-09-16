package com.autopartes.app.ui.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.autopartes.app.ui.components.BannerMensaje
import com.autopartes.domain.model.AccountStatus
import com.autopartes.domain.model.User
import com.autopartes.domain.model.UserRole

/**
 * Detalle de usuario (HU-02, RF-04 C3/C4/C6). Muestra la información disponible,
 * permite cambiar rol (con confirmación) y bloquear/desbloquear (con confirmación).
 * Si el usuario editado es la sesión activa, [onSelfChanged] dispara el kick en vivo (RF-04 C5).
 */
@Composable
fun UserDetailScreen(
    user: User,
    onBack: () -> Unit,
    viewModel: AdminViewModel,
    onSelfChanged: () -> Unit
) {
    var confirmarRol by rememberSaveable { mutableStateOf<UserRole?>(null) }
    var confirmarBloqueo by rememberSaveable { mutableStateOf<Boolean?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        TextButton(onClick = onBack) { Text("← Usuarios") }

        Text(
            text = user.nombreCompleto,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Text(text = user.email, style = MaterialTheme.typography.bodyMedium)
        Text(
            text = if (user.estado == AccountStatus.BLOQUEADO) "Estado: Bloqueado" else "Estado: Activo",
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(Modifier.height(24.dp))

        Text(
            text = "Cambiar rol (RF-04 C3)",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            UserRole.entries.forEach { rol ->
                OutlinedButton(
                    onClick = { confirmarRol = rol },
                    enabled = rol != user.rol
                ) {
                    Text(rol.etiqueta)
                }
            }
        }

        Spacer(Modifier.height(32.dp))

        Text(
            text = "Estado de la cuenta (RF-04 C4)",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(8.dp))
        if (user.estado == AccountStatus.BLOQUEADO) {
            Button(onClick = { confirmarBloqueo = false }) {
                Text("DESBLOQUEAR CUENTA")
            }
        } else {
            Button(onClick = { confirmarBloqueo = true }) {
                Text("BLOQUEAR CUENTA")
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Bloquear o cambiar rol incrementa users.token_version: la sesión del afectado se invalida en el próximo acceso (RF-04 C5).",
            style = MaterialTheme.typography.bodySmall
        )
    }

    confirmarRol?.let { rol ->
        ConfirmActionModal(
            titulo = "Cambiar rol a ${rol.etiqueta}",
            mensaje = "Se actualizará el rol de ${user.nombreCompleto}. Su token quedará invalidado.",
            confirmar = "CAMBIAR ROL",
            onConfirm = {
                viewModel.cambiarRol(user.id, rol, onSelfChanged)
                confirmarRol = null
                onBack()
            },
            onDismiss = { confirmarRol = null }
        )
    }

    confirmarBloqueo?.let { bloquear ->
        ConfirmActionModal(
            titulo = if (bloquear) "Bloquear cuenta" else "Desbloquear cuenta",
            mensaje = if (bloquear) {
                "${user.nombreCompleto} no podrá iniciar sesión y su token quedará invalidado."
            } else {
                "${user.nombreCompleto} podrá iniciar sesión nuevamente."
            },
            confirmar = if (bloquear) "BLOQUEAR" else "DESBLOQUEAR",
            onConfirm = {
                viewModel.setEstado(user.id, bloquear, onSelfChanged)
                confirmarBloqueo = null
                onBack()
            },
            onDismiss = { confirmarBloqueo = null }
        )
    }
}

/** Modal de confirmación de operación administrativa (HU-02, RF-04 C3/C4/C6). */
@Composable
private fun ConfirmActionModal(
    titulo: String,
    mensaje: String,
    confirmar: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(titulo) },
        text = { Text(mensaje) },
        confirmButton = {
            Button(onClick = onConfirm) { Text(confirmar) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}