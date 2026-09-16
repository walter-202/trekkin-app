package com.autopartes.app.ui.auth.components

import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation

/** Campo de contraseña con toggle mostrar/ocultar (usado en login y registro). */
@Composable
fun PasswordField(value: String, onValueChange: (String) -> Unit, label: String) {
    var mostrando by rememberSaveable { mutableStateOf(false) }

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = if (mostrando) VisualTransformation.None else PasswordVisualTransformation(),
        trailingIcon = {
            TextButton(onClick = { mostrando = !mostrando }) {
                Text(if (mostrando) "Ocultar" else "Mostrar")
            }
        }
    )
}