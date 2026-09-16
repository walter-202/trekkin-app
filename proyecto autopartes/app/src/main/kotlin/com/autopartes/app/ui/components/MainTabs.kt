package com.autopartes.app.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.weight
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class MainTab { CATALOGO, CUENTA }

/**
 * Selector simple de pestañas (Catálogo público / Cuenta). Es el contenedor del Gate:
 * el detalle completo exige login recién en HU-05; el catálogo es público (RF-07).
 */
@Composable
fun MainTabs(selected: MainTab, onSelect: (MainTab) -> Unit) {
    Row(Modifier.fillMaxWidth()) {
        TabItem(
            label = "Catálogo",
            selected = selected == MainTab.CATALOGO,
            modifier = Modifier.weight(1f),
            onClick = { onSelect(MainTab.CATALOGO) }
        )
        TabItem(
            label = "Cuenta",
            selected = selected == MainTab.CUENTA,
            modifier = Modifier.weight(1f),
            onClick = { onSelect(MainTab.CUENTA) }
        )
    }
}

@Composable
private fun TabItem(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = MaterialTheme.shapes.small,
        color = if (selected) MaterialTheme.colorScheme.secondaryContainer
        else MaterialTheme.colorScheme.surface,
        border = if (selected) null
        else androidx.compose.foundation.BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant
        )
    ) {
        Text(
            text = label,
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) MaterialTheme.colorScheme.onSecondaryContainer
            else MaterialTheme.colorScheme.onSurface
        )
    }
}