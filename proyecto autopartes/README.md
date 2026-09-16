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

- **HU-01 (Fase 1)**: scaffold Gradle completo + Registro/Login/Logout + Gate por rol,
  implementados con dominio puro + Room local + sesión segura (SharedPreferences privadas).
  Compilación y matrix emulador: **pendientes del equipo** (no hay toolchain Android en la
  máquina de desarrollo).
