# PLANIFICACIÓN POR SPRINTS

> **Extensión propia del informe** (va más allá de la plantilla Lidemoda): cada sprint documenta **análisis → diseño → implementación → pruebas**.
> Fuentes de estado: `docs/USER_STORIES.md`, `docs/BACKLOG.md`, código y suites. Porcentajes = figura oficial del equipo.

---

## Visión general de los 5 sprints

| Sprint | Nombre              | HU foco              | PB principales            |
| :----- | :------------------ | :------------------- | :------------------------ |
| S1     | Identidad y base    | HU-01, HU-02         | PB-01, PB-02, PB-03       |
| S2     | Explorar y mapa     | HU-03 (+ guest)      | PB-04…PB-08, PB-12        |
| S3     | Planificar y grabar | HU-07, HU-08         | PB-16…PB-22, PB-17        |
| S4     | Offline y guía      | HU-04, HU-06         | PB-09…PB-11, PB-13…PB-15  |
| S5     | Comunidad y calidad | HU-05, HU-10 + gates | PB-12, PB-23…PB-25, PB-28 |

---

## Sprint 1 — Identidad y base

**Ventana:** semanas 1–2 · **Objetivo:** cuentas, sesión, Gate y base visual estable.

### Análisis

- El visitante necesita crear cuenta e iniciar sesión antes de escrituras protegidas (HU-01, HU-02).
- Se requiere validación estricta (formato de correo, longitud de contraseña, confirmación, alias normalizado, aceptación de normas).
- La sesión debe persistir entre reinicios; el cierre de sesión debe purgar datos locales.
- Errores de red no deben confundirse con credencial inválida (evitar fallbacks falsos).

### Diseño

| Capa            | Decisión                                                                                                               |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------- |
| Dominio         | `RegisterSchema`, `LoginSchema`, `UpdateProfileSchema` (Zod) en `core/domain/auth.schemas.ts`                          |
| Aplicación      | Casos de uso puros: `RegisterUser`, `LoginUser`, `LogoutUser`, `UpdateUserProfile` con puertos                         |
| Infraestructura | Firebase Auth + `userProfileService` (Firestore `users/{uid}`); sesión en AsyncStorage `trekkin_auth_user`             |
| Presentación    | `AuthView` + `LoginForm` / `RegisterForm`; `HomeView` / perfil; primitivas `Button`, `Field`, `Banner` + `AndeanTheme` |
| Gate            | `App.tsx`: sin sesión → `AuthView`; con sesión → `HomeView`                                                            |
| RBAC            | Rol inicial `user`, `isBlocked: false`, `summitsCount: 0` en el alta                                                   |

### Implementación

- Registro: `RegisterUser.usecase.ts` → Auth → perfil Firestore → `signOut` (sin auto-sesión espuria).
- Login: `LoginUser.usecase.ts` → valida Zod → `signInWithEmailAndPassword` → lee rol/bloqueo → guarda sesión.
- Logout: `LogoutUser.usecase.ts` → `signOut` + purga local.
- Perfil: edición de `displayName` / `username`; correo solo lectura en UI.
- Estado global Zustand + `AuthContext` como adaptador de puertos.

### Pruebas

| Tipo               | Qué se verifica                                                                                | Resultado                 |
| :----------------- | :--------------------------------------------------------------------------------------------- | :------------------------ |
| Suites             | `src/tests/auth_hu1_hu2.test.ts` — schemas, happy path, errores de credencial, bloqueo, sesión | En verde en suite local   |
| Lint               | `npm run lint` (`tsc --noEmit`)                                                                | 0 errores (gate del repo) |
| Manual / pendiente | Matriz Expo Go y dev-build; verificación de email si se añade                                  | ⏳ (no cierra HU al 100%) |

**Estado al cierre del sprint (USER_STORIES):** HU-01 🟢 95% · HU-02 🟢 90%.

---

## Sprint 2 — Explorar y mapa

**Ventana:** semanas 3–4 · **Objetivo:** catálogo público, detalle con mapa, guest y base `TrekMap`.

### Análisis

- Cualquiera debe poder explorar rutas publicadas sin cuenta (HU-03, RN-08).
- El feed **no** debe incrustar mapas (peso y scroll); el mapa va en el detalle.
- La geometría pública debe ser un **preview acotado y versionado**, no waypoints completos.
- Solo un motor de mapa: MapLibre GL + OpenFreeMap (0 API keys de Google).

### Diseño

| Capa            | Decisión                                                                                                          |
| :-------------- | :---------------------------------------------------------------------------------------------------------------- |
| Dominio         | `RouteFiltersSchema`, `routePreview` versionado, `geoBounds`                                                      |
| Aplicación      | `ListPublishedRoutes*`, `SearchRoutes`, `GetRouteDetail*`, `PublishRoute`, cache SWR                              |
| Infraestructura | `routeService` con **cursor pagination**; `mapStyle.ts` (OpenFreeMap); `routeDetailCache` (AsyncStorage, máx. 30) |
| Presentación    | `ExploreView`, `RouteCard`, `RouteDetailView`, `TrekMap` (`web` / `native`)                                       |
| Gate guest      | `continueAsGuest` solo en memoria; `exitGuest` vuelve a `AuthView`                                                |

### Implementación

- Catálogo paginado: `listPublishedRoutesPaginated(pageSize, lastVisibleDoc)`.
- Detalle: métricas, itinerario, checkpoints; `TrekMap` con polyline, markers, bounds.
- Publicación: genera preview acotado; elimina waypoints completos del doc público.
- Cache local del detalle con identidad ruta + hash de preview.
- Deep link base preparado para HU-05 (`trekkin-app://r/{id}`).

### Pruebas

| Tipo      | Qué se verifica                                                                                                                                 | Resultado   |
| :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :---------- |
| Suites    | `catalog_hu3`, `route_preview_hu3`, `route_detail_online_hu3`, `route_detail_cache_hu3`, `map_service_hu3`, `firestore_rules_published_preview` | En verde    |
| Lint      | `npm run lint`                                                                                                                                  | 0 errores   |
| Pendiente | Expo Go Android/iOS + web localhost; Firebase Emulator de reglas                                                                                | 🟡 gates T9 |

**Estado (USER_STORIES):** HU-03 🟢 90% · guest implementado.

---

## Sprint 3 — Planificar y grabar (HU-07 + HU-08)

**Ventana:** semanas 5–6 · **Objetivo:** borradores de ruta, importación de tracks y grabación GPS con export GPX.

### Análisis

- El usuario debe poder **trazar** una ruta nueva o **importar** GPX/KML/CSV antes de caminarla.
- Durante la grabación: muestreo GPS, limpieza de ruido, descarte de puntos malos, checkpoints y máquina de estados (pausa/reanudar/finalizar).
- El track largo **no** puede colapsar Firestore (RN-06): detalle local; al final, metadatos + GPX.
- Handoff claro: plan listo → inicia grabación (HU-07 → HU-08).

### Diseño

| Capa            | Decisión                                                                                                                                    |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| Dominio         | `plan.ts`, `activity.schemas.ts`, `calculations.ts`, `trackFormats.ts` (GPX 1.1, KML, CSV, RDP)                                             |
| Aplicación      | `SaveDraft`, `UpdatePlan`, `ImportTrackFile`, `StartRecordingFromPlan`, `RecordPoint`, `AddCheckpoint`, `FinishActivity`, `ExportTrackFile` |
| Infraestructura | `usePlanStore` / `activityStore`; SQLite de track; `locationService` con `RECORDING_WATCH_OPTIONS`                                          |
| Presentación    | `CreateRouteView`, `PlanEditorView`, `DraftsView`, `RecordView` → `TrackingView` / `ResultView`, `AddCheckpointModal`                       |
| Reglas          | Descarte `accuracy > 25 m`; `cleanTrack` (jitter/saltos); 7 categorías de checkpoint (Zod)                                                  |

### Implementación

- Formatos: `parseGPX` / `buildGPX11` / `toGeoJSON` / `parseKML` / `parseCSV`.
- Draft dual: Firestore `status:'draft'` + autosave local.
- Grabación: puntos lat/lng/alt con precisión; resumen (distancia, ritmo, velocidad, desnivel).
- Export GPX 1.1 desde el resumen (compatible Garmin/Wikiloc/Strava).
- **Pendiente de diseño/UI:** undo / clear / drag de puntos (BK-041).

### Pruebas

| Tipo      | Qué se verifica                                                                                  | Resultado |
| :-------- | :----------------------------------------------------------------------------------------------- | :-------- |
| Suites    | `plan_hu7`, `track_formats_hu7_hu8`, `activity_hu8`, `activity_track_db`, `activity_gpx_storage` | En verde  |
| Lint      | `npm run lint`                                                                                   | 0 errores |
| Pendiente | Expo Go de planificación y grabación; share sheet con adjunto GPX real; edición fina BK-041      | 🟡        |

**Estado (USER_STORIES):** HU-07 🟢 85% · HU-08 🟢 85%.

---

## Sprint 4 — Offline y guía en campo (HU-04 + HU-06)

**Ventana:** semanas 7–8 · **Objetivo:** descarga de paquete offline y seguimiento de una ruta existente con GPS.

### Análisis

- En montaña no hay señal: la ruta y su **mapa base** deben estar en el teléfono.
- Descarga solo para autenticados y con artefactos válidos (par GPX + PMTiles, misma versión).
- El seguimiento (HU-06) reutiliza `TrekMap` y la máquina de estados de actividad; checkpoints por proximidad.
- Background GPS: task implementada; evidencia de pantalla apagada / app terminada **pendiente en dispositivo**.

### Diseño

| Capa            | Decisión                                                                                                                                                     |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dominio         | `offline.ts`, `offline.schemas.ts`, `routeArtifacts`, `mapPackFormats`                                                                                       |
| Aplicación      | `CheckRouteDownloadAvailability`, `EstimateRouteDownloadSize`, `DownloadRouteOffline`, `ResolveOfflinePack`, `StartActivity` / `Pause` / `Resume` / `Finish` |
| Infraestructura | `tileCacheDB` (manifiesto v2, hash, reemplazo atómico); `buildOfflineVectorStyle`; `locationService` + Task Manager                                          |
| Presentación    | `DownloadRouteModal`, `DownloadsView`, `PrepareView`, `TrackingView`, `HistoryView`                                                                          |
| Fallback        | Si el renderer PMTiles no está disponible → trail GPX neutral (no inventar basemap)                                                                          |

### Implementación

- Estimación real de tamaño (`estimateTileCount` / `estimateDownloadSizeMB`).
- Descarga binaria desde Storage → verificación → promoción atómica → manifiesto.
- Trazado offline desde el **GPX parseado**, no del preview público.
- Tracking: trazado oficial + track GPS + posición + HUD.
- Checkpoints auto por `isNearM` + manual.
- **Pendientes backlog:** `packSpec` badge (BK-012), progreso/cuota (BK-014), tracking 100% en `TrekMap` (BK-023), reintento unsynced (BK-032).

### Pruebas

| Tipo              | Qué se verifica                                                                                                                                                    | Resultado                |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| Suites            | `offline_hu4`, `offline_bundle`, `offline_map_fallback`, `map_pack_formats`, `storage_rules_route_bundle`, `activity_hu6`, `activity_store`, `background_location` | En verde (lógicas puras) |
| Lint              | `npm run lint`                                                                                                                                                     | 0 errores                |
| Pendiente crítico | Modo avión en físico; renderer PMTiles en frío; GPS con pantalla apagada / app terminada / endurance                                                               | 🟡 T9 — bloquea 100%     |

**Estado (USER_STORIES):** HU-04 🟡 80% · HU-06 🟡 75%.

---

## Sprint 5 — Comunidad y calidad (HU-05 + HU-10 + gates)

**Ventana:** semanas 9–10 · **Objetivo:** compartir rutas, administración con auditoría y cierre de calidad.

### Análisis

- Compartir solo tiene sentido con rutas **publicadas** (RN-01).
- El admin necesita listar usuarios (incluso >50), bloquear/desbloquear y cambiar roles `user`↔`admin`, todo auditado.
- No existe HU-09 / moderador: revisión = admin.
- El 100% de HU exige matriz de dispositivo + revisión UI + OK del equipo (regla T9).

### Diseño

| Capa            | Decisión                                                                                                                |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------- |
| Dominio         | `share.schemas.ts`, `userManagement.schemas.ts`, `AccountLogEntry`                                                      |
| Aplicación      | `ShareRoute`, `CopyShareLink`, `ExportTrackFile`; `ListUsers` (port paginado), `BlockUser`, `UnblockUser`, `AssignRole` |
| Infraestructura | `shareService`; `userProfileService.listUsersPage` (cursor id ascendente + hasMore); `accountLogService` inmutable      |
| Presentación    | `ShareModal`, `UserManagementView`, `UserCard`, `UserDetailView`, `ConfirmActionModal`                                  |
| Seguridad       | `firestore.rules`: `accountLogs` create-only, `actorId === auth.uid`; anti-autobloqueo en app + reglas                  |

### Implementación

- Deep link `trekkin-app://r/{routeId}` + `Linking.addEventListener` en `App.tsx`.
- Modal de compartir: resumen, copiar enlace, Share Sheet nativo.
- Lista admin: páginas acotadas, filtros en memoria sobre páginas recorridas, reinicio de recorrido al cambiar filtro.
- Bitácora con acción, actor, antes/después y timestamp.

### Pruebas

| Tipo      | Qué se verifica                                                                                                    | Resultado           |
| :-------- | :----------------------------------------------------------------------------------------------------------------- | :------------------ |
| Suites    | `share_hu5`, `gpx_delivery`, `user_management_hu10`                                                                | En verde            |
| Lint      | `npm run lint`                                                                                                     | 0 errores           |
| Pendiente | Share sheet + adjunto GPX en dispositivo; lista admin con >50 usuarios en Expo Go; `/ui-review`; Firebase Emulator | 🟡 gates BK-051/052 |

**Estado (USER_STORIES):** HU-05 🟢 80% · HU-10 🟢 90%.

---

## Cierre de MVP: checklist de aceptación del producto

| #   | Criterio                              | Evidencia                         | Estado              |
| :-- | :------------------------------------ | :-------------------------------- | :------------------ |
| 1   | Registro/login/perfil/guest funcionan | suites auth + Gate                | 🟢                  |
| 2   | Catálogo + detalle + mapa online      | suites HU-03 + capturas           | 🟢                  |
| 3   | Descarga offline + modo avión         | suites offline + evidencia físico | 🟡                  |
| 4   | Plan + grabación + export GPX         | suites plan/activity              | 🟢 / UI 🟡          |
| 5   | Compartir + deep link                 | suites share + prueba nativa      | 🟡                  |
| 6   | Admin + auditoría                     | suites HU-10                      | 🟢 / dispositivo 🟡 |
| 7   | `npm run lint` 0 · suites en verde    | CI local                          | 🟢                  |
| 8   | Matriz Expo Go + web + modo avión     | BK-051                            | 🟡                  |
| 9   | `/ui-review` sin blockers             | BK-052                            | 🟡                  |
| 10  | OK del equipo para declarar 100%      | BK-053                            | ⏳                  |

> **Ninguna HU se declara 100%** hasta completar 8–10. Fuente: `docs/USER_STORIES.md`.

---

_Sigue: [04-casos-uso-uml.md](04-casos-uso-uml.md)._
