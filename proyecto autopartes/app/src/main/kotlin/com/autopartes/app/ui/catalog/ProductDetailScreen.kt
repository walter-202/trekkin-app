package com.autopartes.app.ui.catalog

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.autopartes.app.ui.components.BannerMensaje
import com.autopartes.domain.model.PartVariant
import com.autopartes.domain.model.ProductDetail

/** URL pública de la ficha (RF-09): {codigoOem} identifica el grupo de forma estable. */
internal fun fichaLink(codigoOem: String) = "https://autopartes.bo/o/$codigoOem"

/** Texto compartible de la ficha (RF-09 C1). */
internal fun textoFicha(detail: ProductDetail): String = buildString {
    appendLine(detail.oemPart.nombreComun)
    appendLine("Código OEM: ${detail.oemPart.codigoOem}")
    appendLine(detail.descripcion)
    detail.variantes?.forEach { variante ->
        appendLine("· ${variante.marcaFabricante} ${variante.codigoFabricante} — ${"%.2f".format(variante.precioUnitario)}")
    }
    append("Stock disponible: ${detail.stockTotal ?: "—"} · ")
    append(fichaLink(detail.oemPart.codigoOem))
}

/**
 * Ficha técnica del repuesto (HU-05, RF-08/RF-09).
 * - Con sesión: descripción, variantes con precio, stock acumulado y acciones de
 *   compartición (WhatsApp + copiar enlace).
 * - Visitante: resumen + invitación a iniciar sesión para ver la ficha completa.
 */
@Composable
fun ProductDetailScreen(
    sesionActiva: Boolean,
    onBack: () -> Unit,
    onOpenLogin: () -> Unit,
    detailState: DetailUiState
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        TextButton(onClick = onBack) { Text("← Volver al catálogo") }
        Spacer(Modifier.height(8.dp))

        when (val current = detailState) {
            DetailUiState.Cargando -> {
                CircularProgressIndicator()
            }

            is DetailUiState.Error -> BannerMensaje(current.mensaje)

            is DetailUiState.Resultado -> TarjetaFicha(
                detail = current.detail,
                sesionActiva = sesionActiva,
                onOpenLogin = onOpenLogin
            )
        }
    }
}

@Composable
private fun TarjetaFicha(
    detail: ProductDetail,
    sesionActiva: Boolean,
    onOpenLogin: () -> Unit
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    var copiado by remember { mutableStateOf(false) }

    val part = detail.oemPart

    Text(
        text = part.nombreComun,
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold
    )
    Spacer(Modifier.height(4.dp))
    Text(
        text = "Código OEM: ${part.codigoOem}" +
            (part.categoria?.let { " · Categoría: $it" } ?: ""),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(Modifier.height(8.dp))
    Text(
        text = detail.descripcion,
        style = MaterialTheme.typography.bodyMedium
    )

    if (!detail.esCompleta || !sesionActiva) {
        Spacer(Modifier.height(16.dp))
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.secondaryContainer
        ) {
            Column(Modifier.padding(12.dp)) {
                Text(
                    text = "Inicia sesión para ver precio, especificaciones y stock.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
                Spacer(Modifier.height(8.dp))
                Button(onClick = onOpenLogin) {
                    Text("Iniciar sesión")
                }
            }
        }
        return
    }

    Spacer(Modifier.height(16.dp))
    detail.variantes?.forEach { variante ->
        VarianteFichaRow(variante)
        Spacer(Modifier.height(6.dp))
    }

    Text(
        text = "Stock disponible del grupo: ${detail.stockTotal}",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold
    )

    Spacer(Modifier.height(16.dp))

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = { compartirWhatsApp(context, detail) }) {
            Text("WhatsApp")
        }
        OutlinedButton(
            onClick = {
                clipboard.setText(AnnotatedString(fichaLink(part.codigoOem)))
                copiado = true
            }
        ) {
            Text("Copiar enlace")
        }
    }
    if (copiado) {
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Enlace copiado al portapapeles.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
private fun VarianteFichaRow(variante: PartVariant) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Surface(
            modifier = Modifier.width(84.dp),
            shape = MaterialTheme.shapes.small,
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Text(
                text = "%.2f".format(variante.precioUnitario),
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(Modifier.width(8.dp))
        Column {
            Text(
                text = "${variante.marcaFabricante} · ${variante.codigoFabricante}",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = variante.nombreComercial,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/** Compartir por WhatsApp (RF-09 C1); si no hay WhatsApp instalado, abre el chooser. */
private fun compartirWhatsApp(context: Context, detail: ProductDetail) {
    val texto = textoFicha(detail)
    val base = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, texto)
    }
    val whatsapp = Intent(base).apply { setPackage("com.whatsapp") }
    try {
        context.startActivity(whatsapp)
    } catch (e: ActivityNotFoundException) {
        context.startActivity(Intent.createChooser(base, "Compartir ficha técnica"))
    }
}