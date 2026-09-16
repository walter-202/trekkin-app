package com.autopartes.app.ui.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.autopartes.app.ui.auth.components.PasswordField
import com.autopartes.app.ui.components.BannerMensaje

/** Pantalla de registro de cuenta (RF-01 C1, HU-01). Rol CLIENTE por defecto. */
@Composable
fun RegisterScreen(
    mensaje: String?,
    onRegister: (nombre: String, email: String, password: String) -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var nombre by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmacion by rememberSaveable { mutableStateOf("") }
    var errorLocal by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(24.dp)
    ) {
        Text(
            text = "Crear cuenta",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Únete para comprar repuestos y gestionar tu garaje virtual.",
            style = MaterialTheme.typography.bodyMedium
        )

        if (mensaje != null) {
            Spacer(Modifier.height(16.dp))
            BannerMensaje(mensaje)
        }
        errorLocal?.let {
            Spacer(Modifier.height(16.dp))
            BannerMensaje(it)
        }

        Spacer(Modifier.height(24.dp))

        OutlinedTextField(
            value = nombre,
            onValueChange = { nombre = it },
            label = { Text("Nombre completo") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Correo electrónico") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))

        PasswordField(label = "Contraseña (mínimo 8 caracteres)", value = password, onValueChange = { password = it })

        Spacer(Modifier.height(12.dp))

        PasswordField(label = "Repite tu contraseña", value = confirmacion, onValueChange = { confirmacion = it })

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = {
                if (password != confirmacion) {
                    errorLocal = "Las contraseñas no coinciden."
                } else {
                    errorLocal = null
                    onRegister(nombre, email, password)
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("CREAR CUENTA")
        }

        Spacer(Modifier.height(8.dp))

        TextButton(
            onClick = onNavigateToLogin,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("¿Ya tienes cuenta? Inicia sesión")
        }
    }
}