# Autopartes — Historias de Usuario (V1.0)

> Figura oficial del proyecto **Autopartes** (Android nativo, Kotlin). Alcance V1.0:
> 3 perfiles (Cliente, Vendedor, Administrador) y los RF-01…RF-13 (MoSCoW).
> Formato heredado del repo trekkin-app: cada HU tiene criterios verificables,
> trazabilidad RF ↔ HU y evidencia.
> Exclusiones V1.0: sin número de placa, sin escáner/QR, sin pagos/carrito, sin GPS.

## Mapas de trazabilidad

### RF → HU

| RF    | Descripción                                    | HU           |
| ----- | ---------------------------------------------- | ------------ |
| RF-01 | Registro/Login/Logout seguro (JWT)             | HU-01        |
| RF-02 | Garaje Virtual sin placa                       | HU-03        |
| RF-03 | Vehículo activo como filtro del catálogo       | HU-03        |
| RF-04 | Panel admin: roles + bloqueo (invalida tokens) | HU-02        |
| RF-05 | Compatibilidad Garaje→catálogo                 | HU-03, HU-04 |
| RF-06 | Búsqueda por nombre común u OEM                | HU-04        |
| RF-07 | Tarjetas resumen del catálogo                  | HU-04        |
| RF-08 | Gate de autenticación en Ficha Técnica         | HU-05        |
| RF-09 | Compartir Ficha Técnica (Intent)               | HU-05        |
| RF-10 | Mostrador vendedor (consulta rápida)           | HU-06        |
| RF-11 | Stock agrupado por Código OEM                  | HU-07        |
| RF-12 | Punto de reorden + alertas stock crítico       | HU-07        |
| RF-13 | Sugerencia de OC (Should)                      | HU-08        |

### HU → Fases

| Fase                 | HU                    |
| -------------------- | --------------------- |
| A (núcleo comercial) | HU-01 → HU-04 → HU-03 |
| B (operación)        | HU-02 → HU-06 → HU-05 |
| C (inventario)       | HU-07 → HU-08         |

---

## HU-01: Acceso y sesión — (fase A, primera en implementarse)

- **Rol:** Visitante. **Como** usuario nuevo **quiero** registrarme e iniciar/cerrar sesión
  de forma segura **para** acceder al catálogo completo y a las funcionalidades de mi rol.
- Criterios:
  1. Registro con nombre completo, correo y contraseña; crea el perfil con rol **`cliente`**
     por defecto (`RF-01 C1`).
  2. Login con correo + contraseña; emite JWT + refresh token y persiste la sesión local
     (almacenamiento seguro) (`RF-01 C2`).
  3. Logout revoca la sesión (token descartado/revocado) (`RF-01 C3`).
  4. Gate de autenticación por rol: visitante ve solo lo público; cada rol llega a sus
     pantallas (`RF-01 C4`, ver HU-05 RF-08).
  5. Mensajes de error descriptivos ante credenciales inválidas/bloqueo (`RF-01 C5`, HU-02).
- Verificación: registrar→login→logout en emulador Android 8.0+; sesión persiste tras
  reinicio; logout revoca.
- Estado actual: **Fase A — scaffold HU-01 implementado** (`:domain` usecases+puertos,
  `:data` Room local + sesión, `:app` Compose + Gate). Compilación (`./gradlew build`)
  y matriz emulador: **pendientes del equipo** (sin toolchain Android en la máquina).

## HU-02: Panel de administración de usuarios — (fase B)

- **Rol:** Administrador. **Como** administrador **quiero** gestionar usuarios (roles y
  estado) **para** controlar el acceso y la seguridad de la plataforma.
- Criterios:
  1. Módulo "Gestión de Usuarios" visible **solo** con rol `admin` (`RF-04 C1`).
  2. Listado de usuarios con búsqueda por nombre/correo y filtros de rol/estado (`RF-04 C2`).
  3. Cambio de rol entre `cliente`, `vendedor`, `admin` con confirmación (`RF-04 C3`).
  4. Bloqueo/desbloqueo de cuenta (estado `activo`/`bloqueado`) (`RF-04 C4`).
  5. **Invalidación inmediata de tokens**: al bloquear/cambiar rol se incrementa
     `users.token_version` y la siguiente petición del usuario afectado es rechazada
     (kick en vivo) (`RF-04 C5`).
  6. Confirma la operación con mensaje de éxito (`RF-04 C6`).
- Verificación: matriz admin/cliente/vendedor en emulador; bloqueo revoca sesión activa.
- Estado actual: **implementada** (`:domain` `ListUsers`/`AssignRole`/`SetAccountStatus` con
  RBAC por sesión activa + `User.tokenVersion`; `:data` `updateRol`/`updateEstado` incrementan
  `token_version`, `UserDao` ampliado y seed admin demo `UserSeed`; `:app` tab `Usuarios`
  solo admin (`MainTabs` + Gate), `AdminNavHost` lista → detalle con modal de confirmación,
  búsqueda + `FilterChip` de rol/estado; kick en vivo en `GetCurrentSession` + `SessionViewModel.revalidar`).
  Compilación (`./gradlew build`), detekt y matriz admin/cliente/vendedor: **pendientes del equipo**
  (sin toolchain Android en la máquina).
- Nota demo: la cuenta `admin@autopartes.bo` / `Admin123456` (seed `UserSeed`, solo si la
  tabla `users` está vacía) permite probar el panel; el registro siempre crea rol `cliente`.

## HU-03: Garaje Virtual sin placa — (fase A)

- **Rol:** Cliente/Vendedor/Admin autenticados. **Como** usuario **quiero** registrar mis
  vehículos y elegir uno activo **para** que todo el catálogo se filtre por compatibilidad.
- Criterios:
  1. Alta de vehículo con **Marca, Modelo, Año y Cilindrada/Motor** — **sin número de
     placa** (`RF-02 C1`, exclusión V1.0).
  2. Listado y edición de mis vehículos (`RF-02 C2`).
  3. Un único **vehículo activo** por usuario (filtro automático predeterminado)
     (`RF-03 C1`, `RF-05 C1`).
  4. El vehículo activo acota el catálogo a partes compatibles (`vehicle_compatibilities`)
     (`RF-05 C2`).
- Verificación: alta + cambio de vehículo activo recalcula el catálogo visible.
- Estado actual: **Fase A — HU-03 implementado**. `:domain` (Vehicle, GarageRepository,
  CompatibilityRepository, usecases Register/Update/SetActive/List/GetActive +
  SearchCatalogForActiveVehicle), `:data` (Room `vehicles` + `vehicle_compatibilities`
  transaccional, seed demo por marca en `GarageSeed`), `:app` (garaje dentro del tab
  Cuenta: `GarageNavHost` lista→alta→edición, `GarageViewModel`, marcado de activo con
  mensaje de confirmación). La búsqueda del catálogo (HU-04) se acota por el vehículo
  activo (RF-05 C2) vía `SearchCatalogForActiveVehicle`; sin sesión, sin vehículo activo o
  sin compatibilidades registradas la búsqueda no se acota (regla de seguridad del
  scaffold). Tests de dominio nuevos (RegisterVehicle, UpdateVehicle, SetActiveVehicle,
  SearchCatalogForActiveVehicle). Compilación/matriz emulador: pendientes del equipo.

## HU-04: Catálogo y búsqueda — (fase A)

- **Rol:** Visitante (público). **Como** usuario **quiero** buscar repuestos por nombre
  común u código OEM y ver un resumen **para** encontrar rápido lo que necesito.
- Criterios:
  1. Búsqueda por teclado con nombre común (ej. "pastillas de freno") o **código OEM
     directo** (`RF-06 C1`).
  2. Respuesta < 2s en OEM/filtros (índices/FTS) (`RNF-02 C1`).
  3. Tarjeta resumen por repuesto: **imagen, nombre, marca, precio, código OEM**
     (`RF-07 C1`).
  4. Si hay vehículo activo (HU-03), la búsqueda respeta la compatibilidad (`RF-05 C3`).
- Verificación: búsquedas EOF+nombre; timing <2s.
- Estado actual: **Fase A — HU-04 implementado** (catálogo público + búsqueda
  nombre/OEM con debounce, tarjeta resumen con placeholder de imagen). El filtro por
  vehículo activo (RF-05 C3) llegó con HU-03 (`SearchCatalogForActiveVehicle`). Timings y
  matriz emulador: pendientes del equipo.

## HU-05: Ficha técnica y compartición — (fase B)

- **Rol:** Visitante + autenticados. **Como** usuario **quiero** ver el detalle completo de
  un repuesto y compartirlo **para** decidir y difundir la ficha técnica.
- Criterios:
  1. **Gate de autenticación**: la ficha completa (detalles, precio, stock) exige sesión;
     el visitante ve un resumen + invitación a login (`RF-08 C1`).
  2. Ficha técnica: descripción, especificaciones, precio, stock acumulado del grupo OEM
     (`RF-08 C2`).
  3. Compartir mediante Intenciones nativas: **WhatsApp** y **copiar enlace**
     (`RF-09 C1`).
- Verificación: visitante→login→ficha; share abre WhatsApp/copia URL.
- Estado actual: **implementada** (desde la tarjeta del catálogo HU-04, tocable, se abre la
  ficha). `:domain` (`ProductDetail` con `esCompleta`, `CatalogError.ProductoNoEncontrado`,
  `CatalogRepository.getDetail` y usecase `GetProductDetail` que aplica el Gate RF-08: sin
  sesión devuelve resumen sin variantes/precio/stock), `:data` (`CatalogDao.findOemById`,
  `CatalogRepositoryImpl.getDetail` entrega la ficha factual con variantes + `SUM(inventory)`
  del grupo OEM vía `InventoryDao`), `:app` (`DetailViewModel`, `ProductDetailScreen` con
  resumen + panel "Iniciar sesión" para visitantes y, con sesión, variantes/precio/stock +
  botones **WhatsApp** (Intent nativo; fallback al chooser si no está instalado) y **Copiar
  enlace** vía portapapeles, enlace `https://autopartes.bo/o/{codigoOem}`). Tests de dominio
  nuevos (`GetProductDetailTest`: visitante → resumen, cliente autenticado → ficha completa,
  oem inexistente → `ProductoNoEncontrado`). Compilación (`./gradlew build`), detekt y matriz
  emulador: **pendientes del equipo** (sin toolchain Android en la máquina).

## HU-06: Mostrador vendedor — (fase B)

- **Rol:** Vendedor. **Como** vendedor **quiero** una consulta rápida por teclado **para**
  desplegar al instante precio y stock acumulado en el mostrador.
- Criterios:
  1. Pantalla "Consulta Rápida" visible solo con rol `vendedor` (o `admin`) (`RF-10 C1`).
  2. Búsqueda inmediata por teclado (nombre común u OEM) sin pasos extra (`RF-10 C2`).
  3. Despliegue instantáneo de **precio y stock acumulado** del grupo OEM (`RF-10 C3`).
- Verificación: 3 caracteres → resultado; time-to-result <2s.
- Estado actual: **implementada** (decisión del equipo: precio por variante + stock total en
  el mostrador; solo el stock se acumula). `:domain` (`CounterHit`, puerto
  `InventoryRepository`, `CounterError`, usecase `CounterQuery` con RBAC vendedor/admin por
  sesión activa), `:data` (Room `inventory` en versión 4, `InventoryDao`
  con `SUM(cantidad)` por variante, `InventorySeed` demo sobre las variantes v-1…v-10 del
  `CatalogSeed`, `InventoryRepositoryImpl` reutiliza `CatalogDao` para nombre/OEM),
  `:app` (tab `Mostrador` solo vendedor/admin en `MainTabs` + Gate, `CounterViewModel` con
  debounce 300ms → sensación directa al teclear, `CounterScreen` busca y agrupa por grupo
  OEM con precio por variante y `stockTotal`). Tests de dominio nuevos
  (`CounterQueryTest`: vendedor OK, admin OK, cliente/sin sesión → `SoloVendedores`,
  búsqueda vacía → `BusquedaInvalida`, sin coincidencias → lista vacía). Compilación
  (`./gradlew build`), detekt, timing <2s y matriz emulador: **pendientes del equipo**
  (sin toolchain Android en la máquina).

## HU-07: Inventario agrupado OEM y reorden — (fase C)

- **Rol:** Administrador. **Como** admin **quiero** ver el stock sumado por código OEM y las
  alertas de stock crítico **para** comprar de forma inteligente y no perder ventas.
- Criterios:
  1. Stock de cada grupo OEM = suma de todas las marcas/fabricantes equivalentes
     (`RF-11 C1`).
  2. Cálculo de punto de reorden sobre el stock acumulado (`reorder_point`)
     (`RF-12 C1`).
  3. Panel de alertas visuales de **Stock Crítico** para el admin (`RF-12 C2`).
- Verificación: dos variantes del mismo OEM suman en una tarjeta; alerta si Σ ≤ reorder.
- Estado actual: **implementada** (decisión del equipo: el panel es solo admin, RF-11/RF-12;
  reutiliza `inventory`/`oem_parts`/`part_variants` de HU-06, sin tablas nuevas).
  `:domain` (`OemStockGroup` con `esCritico = stockTotal <= reorderPoint`, puerto
  `InventoryRepository.stockAgrupadoPorOem()`, `InventoryError.SoloAdmin`, usecase
  `ListCriticalStockGroups` con RBAC solo admin por sesión activa y orden por `stockTotal`
  ascendente), `:data` (`CatalogDao.getAllOemParts` agregado; `InventoryRepositoryImpl`
  reutiliza `findVariantsByOemIds` + `InventoryDao.stockByVariantIds` — mismos DAOs de
  HU-06, sin duplicar consultas), `:app` (hub `AdminNavHost`: tarjetas "Gestión de
  Usuarios" / "Stock Crítico", ruta `stock-critico` con `CriticalStockViewModel` +
  `CriticalStockScreen` con tarjeta de color de alerta que muestra fabricantes,
  `stockTotal` vs `reorderPoint`; provider en `UseCaseModule`; todo bajo el Gate admin
  del tab Usuarios). Tests de dominio nuevos (`ListCriticalStockGroupsTest`: admin ve solo
  críticos ordenados, cliente/vendedor/sin sesión → `SoloAdmin`) y
  `FakeInventoryRepository` ampliado con un grupo crítico coherente con el seed (o-5).
  Compilación (`./gradlew build`), detekt y matriz emulador: **pendientes del equipo**
  (sin toolchain Android en la máquina).

## HU-08: Sugerencia de Orden de Compra — (fase C, Should) ✅ implementada

- **Rol:** Administrador. **Como** admin **quiero** generar automáticamente un borrador de
  OC **para** reabastecer solo lo necesario con proveedor y cantidad.
- Criterios:
  1. Genera borrador de OC con **proveedor, cantidad requerida y repuestos a reabastecer**
     (`RF-13 C1`).
  2. `cantidad_requerida = reorder_point − stock_actual` (mín. 0, solo grupos bajo reorden)
     (`RF-13 C2`).
  3. La OC queda en estado `borrador` editable (`RF-13 C3`).
- Estado actual: **implementada** (fase C completa con HU-07, RF-13). `:domain`
  (`PurchaseOrderDraft` con `ESTADO_BORRADOR`, `PurchaseOrderLine`, puerto
  `PurchaseOrderRepository.generarBorradorDeOC()`, `OrderError.SoloAdmin /
SinGruposBajoReorden / ProveedorNoEncontrado / ErrorDesconocido`, usecase
  `GeneratePurchaseOrder` con RBAC solo admin por sesión activa), `:data` (Room versión 5
  con `suppliers` + `purchase_order_drafts` + `purchase_order_lines` conforme a
  DATABASE.md §3.9/§3.10/§3.11; `SupplierSeed` demo por marca del `CatalogSeed`
  (Bosch/Denso/TRW); `OrderDao.guardarBorrador` transaccional + `SupplierDao`;
  `PurchaseOrderRepositoryImpl` reutiliza `InventoryRepository.stockAgrupadoPorOem` (el
  mismo de HU-07) para filtrar solo los grupos bajo reorden y calcular
  `reorderPoint − stockTotal` (mín. 0), elige proveedor por heurística documentada y
  persiste con `estado = "borrador"`), `:app` (card "Sugerencia de OC" en el hub
  `AdminNavHost` + ruta `oc-sugerencia`, `PurchaseOrderViewModel` con rebote `Inicial /
Cargando / Datos / Error`, `PurchaseOrderScreen` con botón "Generar borrador de OC",
  tarjeta de proveedor, badge `borrador` y líneas repuesto/stock/cantidad; provider en
  `UseCaseModule`; todo bajo el Gate admin). Tests de dominio nuevos
  (`GeneratePurchaseOrderTest`: admin → borrador con `cantidadRequerida` correcta y solo
  grupos bajo reorden, cliente/vendedor/sin sesión → `SoloAdmin`, sin grupos bajo reorden
  → `SinGruposBajoReorden`) y `FakePurchaseOrderRepository` en memoria que espeja el
  cálculo del repositorio real sobre `FakeInventoryRepository` (o-5 crítico del seed).
  Compilación (`./gradlew build`), detekt y matriz emulador: **pendientes del equipo**
  (sin toolchain Android en la máquina).
- Verificación: generar OC con 2 grupos críticos; revisar líneas y proveedor.

---

## Roadmap V2 (fuera de alcance V1.0)

- Número de placa (rechazado en V1.0).
- Escáner de cámara/QR.
- Pasarelas de pago / carrito.
- Rastreo GPS.

## Verificación general

```bash
./gradlew build          # compila módulos (domain/data/app)
./gradlew detekt         # análisis estático (0 bloqueantes)
./gradlew test           # unit tests de domain/data
matriz emulador 8.0+     # por cada HU: flujo funcional en dispositivo
```
