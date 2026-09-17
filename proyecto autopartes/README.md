# Autopartes — Aplicación Android V1.0

Aplicación Android nativa (Kotlin, Android 8.0+, Jetpack Compose) para la
comercialización de autopartes y gestión de inventarios.

## Módulos (Clean Architecture)

- `:domain` — Kotlin puro: entidades, casos de uso y puertos (sin Android/Room/Retrofit).
- `:data` — Room (SQLite local) + adaptadores que implementan los puertos (Hilt).
- `:app` — Compose + Navigation + Gate por rol (MVVM).

## Documentación

- `docs/USER_STORIES.md` — HU-01…HU-08 trazadas a RF-01…RF-13 y fases A/B/C.
- `docs/DATABASE.md` — ER normalizado 3FN (agrupación OEM, garaje virtual, token_version).
- `docs/ARCHITECTURE.md` — capas, Gate, contrato API REST.

## Requisitos para compilar (verificación local pendiente del equipo)

1. **JDK 17** y **Android SDK** (compileSdk 35, minSdk 26, targetSdk 35).
2. Abrir el proyecto en **Android Studio** (genera el `gradle-wrapper.jar`/`gradlew`
   automáticamente a partir de `gradle/wrapper/gradle-wrapper.properties`) o ejecutar
   `gradle wrapper` con un Gradle instalado.
3. `local.properties` con `sdk.dir=...` (NO se commitea).

## Verificación por HU

```bash
./gradlew build && ./gradlew detekt && ./gradlew test
matriz de emulador Android 8.0+ (flujo feliz + un caso de error) por cada HU cerrada.
```

## Estado

- **HU-01 (Fase A)** — Registro/Login/Logout + Gate: implementado (dominio + Room + sesión).
- **HU-04 (Fase A)** — Catálogo público + búsqueda nombre/OEM + tarjeta resumen: implementado
  (dominio + Room con seed demo + Compose con debounce 300ms).
- **HU-03 (Fase A)** — Garaje Virtual sin placa: implementado (tabs Cuenta → "Mis vehículos",
  alta/edición, único vehículo activo, seed demo de compatibilidades y filtro del catálogo
  por vehículo activo — RF-05 C2).
- **HU-02 (Fase B)** — Panel de administración de usuarios: implementado (tab "Usuarios" solo
  admin, búsqueda + filtros rol/estado, cambio de rol y bloqueo/desbloqueo con confirmación,
  `token_version` + kick en vivo RF-04 C5, seed admin demo `admin@autopartes.bo`/`Admin123456`).
- **HU-06 (Fase B)** — Mostrador vendedor: implementado (tab "Mostrador" solo vendedor/admin,
  Consulta Rápida con debounce 300ms por nombre común u OEM, precio por variante + stock
  total del grupo OEM — RF-10 C3 —, Room `inventory` v4 con seed demo, RECOMENDADO por el
  equipo: solo el stock se acumula).
- **HU-05 (Fase B)** — Ficha técnica y compartición: implementado (tocar una tarjeta del
  catálogo abre la ficha; Gate RF-08 en dominio: visitante ve resumen + invitación a login,
  autenticado ve variantes/precio/stock acumulado; compartir por WhatsApp — Intent nativo —
  y copiar enlace `https://autopartes.bo/o/{codigoOem}`).
- **HU-07 (Fase C)** — Stock crítico por OEM: implementado (hub del panel admin → "Stock
  Crítico" solo con rol admin: grupos OEM con stock = Σ del stock de sus variantes y alerta
  visual cuando `stock ≤ reorder_point` (RF-11/RF-12); reutiliza `inventory` de HU-06 sin
  tablas nuevas).
- **HU-08 (Fase C)** — Sugerencia de Orden de Compra: implementado (card "Sugerencia de OC"
  en el hub admin solo con rol admin: "Generar borrador de OC" calcula solo los grupos bajo
  reorden con `cantidad_requerida = reorder_point − stock_actual` (mín. 0), elige proveedor
  (heurística por marca) y guarda la OC en estado `borrador` editable (RF-13); Room v5 con
  `suppliers` + `purchase_order_drafts` + `purchase_order_lines`, seed demo
  Bosch/Denso/TRW).
- Compilación (`./gradlew build`), detekt y matriz emulador: **pendientes del equipo**
  (no hay toolchain Android en la máquina de desarrollo).
