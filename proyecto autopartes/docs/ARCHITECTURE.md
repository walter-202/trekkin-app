# Autopartes — Arquitectura (Android nativo + Clean Architecture)

> Aplicación Android nativa (Kotlin, Android 8.0+, Jetpack Compose) para la
> Comercialización de Autopartes y Gestión de Inventarios. V1.0.
> Metodología heredada de trekk-in-app: Clean Architecture + puertos, dominio puro,
> casos de uso con puertos inyectados, alcance estricto por HU y Gate por rol.

## 1. Capas y regla de dependencias

```
:app        (presentation · MVVM + Compose + Navigation + Gate por rol · Hilt)
   ↓
:domain     (Kotlin puro · entidades, casos de uso y puertos · SIN Android/Room/Retrofit)
   ↑
:data       (adaptadores · Room + API REST + repositories que implementan los puertos)
```

- `:domain` nunca importa Android, Room, Retrofit ni Hilt.
- `:data` implementa los puertos definidos en `:domain` (Repository Pattern).
- `:app` (MVVM + ViewModels) compone `:data`, nunca reglas de negocio.
- DI: **Hilt** inyecta dependencias por interfaz (`DataModule` en `:data`,
  `UseCaseModule` en `:app` para los casos de uso del dominio).

## 2. Catálogo de módulos Gradle

| Módulo    | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | HU    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `:domain` | entidades (`User` con `tokenVersion`, `Vehicle`, `OemPart`, `PartVariant`, `Inventory`, `Supplier`, `PurchaseOrderDraft`), casos de uso (RegisterUser, LoginUser, LogoutUser, GetCurrentSession, ListUsers, AssignRole, SetAccountStatus, RegisterVehicle, UpdateVehicle, SetActiveVehicle, ListMyVehicles, GetActiveVehicle, SearchCatalog, SearchCatalogForActiveVehicle, GetProductDetail, CounterQuery, AggregateStock, GeneratePurchaseOrder…), puertos (`UserRepository`, `GarageRepository`, `CompatibilityRepository`, `CatalogRepository`, `InventoryRepository`, `OrderRepository`, `SessionManager`) | todas |
| `:data`   | Room DAOs, Retrofit/OkHttp API, `UserRepositoryImpl`, `GarageRepositoryImpl`, `CompatibilityRepositoryImpl`, `CatalogRepositoryImpl`, `InventoryRepositoryImpl`, `OrderRepositoryImpl`, `SessionManagerImpl` (JWT + EncryptedSharedPreferences), mappers                                                                                                                                                                                                                                                                                                                                                        | todas |
| `:app`    | Compose screens por HU, ViewModels, Navigation + **Gate por rol**, Hilt modules (DataModule en `:data`, UseCaseModule en `:app`), tema                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | todas |

## 3. Autenticación y Gate (RF-01, RF-08, RF-04)

- **JWT + refresh token**; el JWT porta `ver` (token_version). El servidor valida
  `ver < users.token_version` ⇒ 401 y revocación (kick en vivo al bloquear/cambiar rol).
- **Offline-first (HU-02)**: en el scaffold local el kick se replica en
  `GetCurrentSession` (rehidrata y compara `tokenVersion`/estado contra Room; si cambió,
  limpia la sesión) y `SessionViewModel.revalidar()` lo dispara tras operaciones del admin.
- **Gate en el nav host**: `startDestination` según estado de sesión —
  `visitante → Splash/Login`; `autenticado → Home`; rutas de rol protegidas por
  `NavArgument`/`hasRole` (cliente/vendedor/admin), espejo del Gate de trekk-in-app.
  El tab **Usuarios** (HU-02) solo se monta con rol `admin` y el `MainTab` tercero es
  condicional (`esAdmin`).
- **Ficha técnica (RF-08)**: la ruta de detalle es navegable por visitante pero muestra
  solo resumen; pantalla completa exige login.

## 4. Patrón de capa por feature (espejo de trekk-in-app)

Vista delgada (Composable) → `ViewModel` → caso de uso (`:domain`) → puerto →
implementación (`:data`, Room + API). Validación en `:domain` (V1.0 sin Zod;
se usa validación Kotlin pura/reglas de dominio; si se adopta, se añade un validador
por entidad). Sin lógica de negocio en UI.

## 5. Contrato API REST (resumen, se detalla con HU-01..08)

```
POST   /auth/register          → rol 'cliente', devuelve perfil
POST   /auth/login             → { accessToken, refreshToken, user }
POST   /auth/logout            → revoca sesión (requiere auth)
GET    /users                  → admin: listar + buscar/filtrar      (HU-02)
PATCH  /users/{id}/role        → admin: cambiar rol                  (HU-02)
PATCH  /users/{id}/status      → admin: bloquear/desbloquear         (HU-02)
GET/POST/PUT  /vehicles        → garaje (HU-03); PATCH /vehicles/{id}/active
GET    /catalog?q=&oem=&vehicle=  → búsqueda + compatibilidad        (HU-04)
GET    /catalog/{oem}/detail   → ficha completa (auth)               (HU-05)
GET    /counter?q=             → vendedor: precio + stock acumulado  (HU-06)
GET    /inventory/groups       → stock por OEM + reorder (admin)     (HU-07)
POST   /purchase-orders/draft  → sugiere OC (admin)                  (HU-08, Should)
```

## 6. Estados offline (Room offline-first)

- Lectura siempre desde Room; la API sincroniza catálogo/inventario en segundo plano.
- Sesión local en almacenamiento seguro; logout limpia datos sensibles.

## 7. Verificación por HU

```bash
./gradlew build && ./gradlew detekt && ./gradlew test
matriz de emulador Android 8.0+ (un flujo feliz + un fallo) por cada HU cerrada.
```

## 8. Cumplimiento Clean (anti-patterns a evitar)

- ❌ `:domain` importando android.* / Room / Retrofit.
- ❌ Lógica de negocio en Compose/ViewModel.
- ❌ Rol validado solo en UI (validar también en API, como RBAC en servidor).
- ❌ Hardcodear precios/estados críticos sin pasar por el caso de uso.
