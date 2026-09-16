package com.autopartes.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF0B4F4C),
    secondary = Color(0xFF176774),
    tertiary = Color(0xFF009688)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF8CD8C8),
    secondary = Color(0xFF9CCDD4),
    tertiary = Color(0xFF80CBC4)
)

@Composable
fun AutopartesTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content
    )
}