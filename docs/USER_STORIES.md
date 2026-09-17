# trekkin-app — Historias de Usuario (Figura Oficial del Equipo)

> **Revisión técnica consolidada 2026-09-17 (MapLibre GL — desbloqueo Android/web).**
> Regla de validación vigente: **100% solo con matriz Expo Go + web localhost + `/ui-review` sin blockers + OK del usuario**. Todo lo demás declara su % real.
>
> **Alcance real consolidado:**
>
> - **🟢 Sólidas (≥80%):** HU-01 (95%), HU-02 (90%), HU-03 (90%), HU-05 (85%), HU-07 (85%), HU-08 (85%), HU-10 (90%).
> - **🟡 En progreso / pendientes de campo:** HU-06 (70%), HU-04 (60%).
> - **🚫 HU-09 eliminada.** Roles vigentes: `user` y `admin`.

---

## 🧭 Guía Técnica para Desarrolladores y Agentes: Qué Usar (Canónico)

Para evitar duplicaciones, componentes obsoletos o reescrituras innecesarias, todos los agentes y desarrolladores **DEBEN** ceñirse a estos estándares técnicos:

### 1. Mapas e Interfaz Visual (V1 MapLibre — Expo Go + web)

- **Componente Único de Mapa:** [`src/presentation/components/map/TrekMap.tsx`](../src/presentation/components/map/TrekMap.tsx) con [`TrekMapProps`](../src/presentation/components/map/TrekMap.types.ts).
  - Motor: **MapLibre GL JS** (estilo OpenFreeMap, datos OSM, 0 API keys de Google).
  - **Web:** GL JS en el DOM (`TrekMap.web.tsx`).
  - **Android / iOS (Expo Go):** el mismo GL JS en `react-native-webview` (`TrekMap.native.tsx`). No es el SDK de Google: no hay logo Google ni key de billing.
  - **V2 (opcional, rebuild):** `@maplibre/maplibre-react-native` + `expo prebuild`. Mismo contrato; ver `docs/plan/plan_mapas_on_offline.md`.
  - **PROHIBIDO:** `react-native-maps`, `PlanMap.tsx`, `OfflineRouteMap.tsx`, teselas PNG caseras, Google Maps API.
- **Catálogo de Rutas (HU-03 Lista):**
  - La tarjeta [`RouteCard.tsx`](../src/presentation/views/explore/RouteCard.tsx) usa `route.coverImageUrl || route.photos?.[0]` o el placeholder andino.
  - **CERO mapas en el feed.**
- **Packs (HU-04, no el detalle):** un archivo PMTiles/MBTiles por ruta. El detalle HU-03 es **online** y no descarga mapa. Anexo: `docs/plan/offline_maps.md`.

### 2. Formatos GPS y Cálculos Geográficos

- **Parsers y Serializadores:** [`src/core/domain/trackFormats.ts`](../src/core/domain/trackFormats.ts).
  - `parseGPX(xml)`: extrae trackpoints, elevación, tiempos y waypoints.
  - `buildGPX` / `buildGPX11`: XML GPX 1.1 canónico (Garmin, Strava, Wikiloc).
  - `toGeoJSON(track)`: capa de usuario para MapLibre (FeatureCollection `[lng,lat]`).
  - `parseKML(kml)`, `parseCSV(csv)`: importación de formatos abiertos.
  - `simplifyTrack(points, toleranceM)`: Ramer-Douglas-Peucker.
- **Packs de fondo (HU-04):** [`src/core/domain/mapPackFormats.ts`](../src/core/domain/mapPackFormats.ts).
  - Detecta `.pmtiles` (V1) vs `.mbtiles` (V2 / `pmtiles convert`).
  - `ResolveOfflinePackUseCase` → `TrekMap.offlinePackPath` pinta `pmtiles://` en el mismo `TrekMap`.
- **Bounding Box y Estimación:** [`src/core/domain/geoBounds.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/geoBounds.ts).
  - `computeBoundingBox(points, padding)`: calcula límites de encuadre geográfico.
  - `boundsToRegion(bounds)`: genera deltas para la cámara del mapa.
  - `estimateTileCount(bounds, minZ, maxZ)` y `estimateDownloadSizeMB(count)`: cálculo matemático real de descarga.
- **Casos de Uso:**
  - Importar archivo de ruta (HU-07): [`ImportTrackFileUseCase`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/plan/ImportTrackFile.usecase.ts).
  - Exportar actividad a GPX (HU-08): [`ExportTrackFileUseCase`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/activity/ExportTrackFile.usecase.ts).

### 3. Firestore y Base de Datos Anti-Colapso

- **Catálogo Paginado:** Usar `routeService.listPublishedRoutesPaginated(pageSize, lastVisibleDoc)` con cursor (`limit` + `startAfter`). Nunca hacer queries abiertas sin límite.
- **Actividades Largas (>500 puntos):** Usar `activityService.saveActivityPointsChunks(id, points)` para almacenar puntos en bloques bajo la subcolección `activities/{id}/points/chunk_{n}`. Protegido en `firestore.rules`.
- **Regla Triple:** Si agregas un campo a una entidad, debe figurar en `types.ts`, `firestore.rules` y `DATABASE.md`.

---

## HU-01: Registrar Cuenta — 🟢 95% funcional

- **Rol:** Visitante.
- **Narrativa:** **Como** usuario nuevo **quiero** registrar una cuenta con mis datos y acceso **para** ingresar a las funciones protegidas y gestionar mi perfil de senderista.
- **Criterios de Aceptación (DoD):**
  1. ✅ Acceso al formulario: modo "Registrarse" en `src/presentation/views/auth/AuthView.tsx` o botón de registro en el Drawer.
  2. ✅ Campos obligatorios: Nombre Completo, Correo, Alias, Contraseña, Confirmación y Checkbox de Normas de Seguridad en Montaña.
  3. ✅ Validación Zod estricta (`RegisterSchema`): formato correo, mín. 8 caracteres, coincidencia exacta, normalización de alias (sin `@`/espacios), términos obligatorios.
  4. ✅ Unicidad: `auth/email-already-in-use` con mensaje amigable en español.
  5. ✅ Rol automático `user`, `summitsCount: 0`, `isBlocked: false`.
  6. ✅ Post-registro: éxito + `signOut` inmediato + retorno a login (sin sesión espuria).
- **Estado real y brecha (5%):** flujo verificado en Expo Go + suites. Falta: verificación de email y matriz en dev-build limpio.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/auth.schemas.ts` (`RegisterSchema`, `UserProfileSchema`).
  - _Aplicación:_ `src/core/application/auth/RegisterUser.usecase.ts`.
  - _Infraestructura:_ `src/infrastructure/database/userProfileService.ts`, Firebase Auth + Firestore (`users/{uid}`).
  - _Presentación:_ `src/presentation/views/auth/RegisterForm.tsx`, `AuthView.tsx`.

---

## HU-02: Sesión, Perfil e Identidad — 🟢 90% (refinamiento)

- **Rol:** Usuario registrado / Administrador.
- **Narrativa:** **Como** usuario registrado **quiero** gestionar mi sesión, consultar mi perfil y actualizar mis datos **para** mantener mi identidad al día.
- **Criterios de Aceptación (DoD):**
  1. ✅ Acceso desde "Iniciar Sesión" o ante acción protegida.
  2. ✅ Campos: correo + contraseña.
  3. ✅ Contraseña con toggle `Eye`/`EyeOff`.
  4. ✅ `LoginSchema`; credencial inválida = error sin sesión.
  5. ✅ Discriminación credencial inválida vs `isNetworkError`.
  6. ✅ `isBlocked === true` rechaza login con mensaje "suspendida".
  7. ✅ Sesión persistente en AsyncStorage `trekkin_auth_user`.
  8. ✅ Avatar con inicial + nombre + badge (`ADMINISTRADOR`/`SENDERISTA`) en Drawer y `HomeView`.
  9. ✅ Cierre seguro: `signOut` + purga local + retorno a visitante.
  10. ⚠️ `ProfileView`: muestra avatar con inicial, alias, rol y correo solo lectura (sin métricas, montaña, tema ni contraseña visible: fuera de alcance). Pendiente: cambio de contraseña (backend + UI).
  11. ✅ `EditProfileView`: edita `displayName`/`username` con `UpdateProfileSchema` (3–150 / regex `/^[a-zA-Z0-9_.]+$/`), email solo lectura, sin teléfono (alcance/privacidad), sin tema ni datos de montaña (fuera de alcance), Guardar/Descartar.
- **Estado real y brecha (10%):** auth sólida. Falta cambio de contraseña y matriz dev-build.
- **Mapeo Técnico:**
  - _Dominio:_ `LoginSchema`, `UpdateProfileSchema` en `src/core/domain/auth.schemas.ts`; `UserProfile` en `types.ts`.
  - _Aplicación:_ `LoginUser` / `LogoutUser` / `UpdateUserProfile` usecases.
  - _Infraestructura:_ `src/infrastructure/auth/AuthContext.tsx`, `userProfileService.ts`.
  - _Presentación:_ `LoginForm.tsx`, `HomeView.tsx`, `ProfileView.tsx`, `EditProfileView.tsx`.

---

## HU-03: Explorar y Consultar Rutas — 🟢 90% funcional

- **Rol:** Visitante / Senderista.
- **Narrativa:** **Como** senderista o visitante **quiero** explorar el catálogo público, buscar y ver el detalle técnico con mapa **para** evaluar la excursión antes de salir.
- **Criterios de Aceptación (DoD):**
  1. ✅ Guest libre: `ExploreView` es la entrada; catálogo + detalle públicos.
  2. ✅ Búsqueda texto + chips dificultad (`Todas/Fácil/Moderado/Difícil/Experto`) con `RouteFiltersSchema`.
  3. ✅ `RouteCard`: nombre, tramo inicio→fin, km, horas, badge dificultad, foto de portada real del usuario (`coverImageUrl || photos[0]`) sin peticiones de mapas.
  4. ✅ `RouteDetailView`: header andino, badge desnivel, métricas (distancia/desnivel/tiempo/modalidad), itinerario, checkpoints con categoría/notas.
  5. ✅ Mapa con `TrekMap.tsx` (MapLibre GL JS): estilo OpenFreeMap oscuro, polyline del trazado, marcadores inicio/fin/checkpoints. **Sin descargar pack** (HU-03 es consulta online). Web = DOM; Android/iOS Expo Go = WebView con el mismo motor. 0 Google Maps SDK.
  6. ✅ Paginación y control de carga: `routeService.listPublishedRoutesPaginated` para consumo eficiente de Firestore.
  7. ✅ Gate amigable: acciones protegidas (descarga/tracking) invitan a sesión sin perder contexto.
- **Estado real y brecha (10%):** catálogo y contrato de mapa listos. Pendiente: matriz Expo Go Android + iOS + web localhost del detalle (calles + trazado + pines) y OK del usuario. Plan: `docs/plan/plan_mapas_on_offline.md`.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/route.schemas.ts`, `src/core/domain/geoBounds.ts`.
  - _Aplicación:_ `ListPublishedRoutes` / `SearchRoutes` / `GetRouteDetail` usecases.
  - _Infraestructura:_ `src/infrastructure/database/routeService.ts`, `routeSeed.ts`, `src/infrastructure/map/mapStyle.ts`.
  - _Presentación:_ `ExploreView.tsx`, `RouteCard.tsx`, `RouteDetailView.tsx`, `TrekMap.web.tsx` / `TrekMap.native.tsx`.
  - _Suite:_ `src/tests/map_service_hu3.test.ts`.

---

## HU-04: Descargar Ruta Offline — 🟡 60% en progreso

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** senderista sin cobertura **quiero** descargar ruta + mapa base **para** consultarla en campo sin internet.
- **Criterios de Aceptación (DoD):**
  1. ✅ Botón "Descargar ruta" en `RouteDetailView` activo y enlazado a `DownloadRouteModal`.
  2. ✅ Estimación matemática real: cálculo de teselas y MB por bounding box y niveles de zoom (12–15) vía `geoBounds.ts` (`estimateTileCount` y `estimateDownloadSizeMB`).
  3. ⚠️ Guardado: persiste JSON del trazado y waypoints. Dominio de pack listo (`mapPackFormats` + `ResolveOfflinePack`). Falta el downloader a disco.
  4. ⚠️ Modo avión: `TrekMap.offlinePackPath` resuelve `.pmtiles` a `pmtiles://` y cambia el estilo. Un `.mbtiles` no se pinta en V1 (mensaje de conversión). Falta copiar el archivo local al dispositivo.
- **Estado real y brecha (40%):** estimación, modal, registro del track y detección PMTiles/MBTiles listos. Falta bajar el archivo del pack al dispositivo.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/offline.ts`, `src/core/domain/geoBounds.ts`, `src/core/domain/mapPackFormats.ts`.
  - _Aplicación:_ `DownloadRouteOffline` / `EstimateRouteDownloadSize` / `ResolveOfflinePack` usecases.
  - _Infraestructura:_ `src/infrastructure/persistence/tileCacheDB.ts`, `src/infrastructure/map/mapStyle.ts` (`buildOfflineVectorStyle`). Destino: `expo-file-system`.
  - _Presentación:_ `DownloadRouteModal.tsx`, `DownloadsView.tsx`, `TrekMap` (`offlinePackPath`).
  - _Suite:_ `src/tests/offline_hu4.test.ts`, `src/tests/map_pack_formats.test.ts`.

---

## HU-05: Compartir Ruta Publicada — 🟢 85% funcional

- **Rol:** Senderista / Usuario.
- **Narrativa:** **Como** usuario **quiero** compartir una ruta pública por enlace y mensajería **para** difundirla con mi grupo.
- **Criterios de Aceptación (DoD):**
  1. ✅ Botón compartir en `RouteDetailView`.
  2. ✅ `ShareRouteUseCase` exige `status === 'published'`.
  3. ✅ URL canónica `trekkin-app://r/{routeId}` por `routeId` Firestore, sin duplicar colecciones.
  4. ✅ `ShareModal`: resumen + caja enlace + "Copiar enlace" (`expo-clipboard` + feedback) + Share Sheet nativo.
  5. ✅ Deep link en `App.tsx` (`Linking.addEventListener`) abre el detalle.
  6. ⚠️ Exportación de archivo: usecase `ExportTrackFileUseCase` disponible para adjuntar archivo `.gpx` al compartir.
- **Estado real y brecha (15%):** flujo verificado. Falta enlazar directamente el share sheet con el archivo GPX generado.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/share.schemas.ts`, `src/core/domain/trackFormats.ts`.
  - _Aplicación:_ `ShareRoute` / `CopyShareLink` / `PublishShareLink` / `ExportTrackFile` usecases.
  - _Infraestructura:_ `src/infrastructure/share/shareService.ts`.
  - _Presentación:_ `ShareModal.tsx`, `RouteDetailView.tsx`.
  - _Suite:_ `src/tests/share_hu5.test.ts`.

---

## HU-06: Realizar una Ruta Existente — 🟡 70% en progreso

- **Rol:** Senderista registrado.
- **Narrativa:** **Como** senderista en campo **quiero** seguir una ruta con GPS en vivo **para** guiarme por el trazado oficial, chequear checkpoints y guardar mi historial.
- **Criterios de Aceptación (DoD):**
  1. ⚠️ `PrepareView`: muestra ruta + GPS + distancia al inicio.
  2. ✅ `TrackingView`: trazado oficial + track GPS + posición + HUD sobre `<TrekMap />`.
  3. ✅ Checkpoints auto-visitados por proximidad (`isNearM`) + manual.
  4. ✅ Pausa/reanuda/finaliza con `completed`/`incomplete` + autosave local + guardado en Firestore.
  5. ⚠️ Background GPS: pantalla bloqueada requiere configurar `expo-task-manager` y `ACCESS_BACKGROUND_LOCATION`.
- **Estado real y brecha (30%):** lógica de estados/métricas y mapa `TrekMap` en prepare/tracking/resultado. Falta background GPS y matriz en dispositivo.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/activity.ts`, `activity.schemas.ts`, `calculations.ts`.
  - _Aplicación:_ `Start/Begin/RecordPoint/Pause/Resume/Finish/List/GetActivity` usecases.
  - _Infraestructura:_ `activityService.ts`, `locationService.ts`, `useActivityStore.ts`.
  - _Presentación:_ `ActivityView`, `PrepareView`, `TrackingView`, `ResultView`, `HistoryView`.
  - _Suite:_ `src/tests/activity_hu6.test.ts`.

---

## HU-07: Planificar Nueva Ruta (Borrador) — 🟢 85% funcional

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** explorador **quiero** trazar puntos provisionales o importar un archivo de ruta **para** consolidar datos antes de la expedición.
- **Criterios de Aceptación (DoD):**
  1. ✅ Acceso desde Drawer / `HomeView`.
  2. ✅ Nombre provisional obligatorio.
  3. ✅ Trazado interactivo de waypoints sobre mapa nativo con callbacks de coordenadas.
  4. ✅ Importación de archivos externos: `ImportTrackFileUseCase` parsea `.gpx`, `.kml` y `.csv`; `toGeoJSON` deja el track listo para MapLibre.
  5. ✅ Dual: Firestore `routes/{id}` `status:'draft'` + autosave Zustand/AsyncStorage.
  6. ✅ `DraftsView` + `PlanEditorView` (listar y editar borradores).
  7. ⚠️ Edición geométrica fina: undo/clear/drag de puntos individuales en UI.
- **Estado real y brecha (15%):** persistencia, modelo y motor de importación completos. Falta pulido de botones undo/clear en la interfaz de edición.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/plan.ts`, `plan.schemas.ts`, `src/core/domain/trackFormats.ts`.
  - _Aplicación:_ `SaveDraft`, `GetDraft`, `UpdatePlan`, `ConfirmStartPoint`, `MarkReadyForGps`, `ImportTrackFile`.
  - _Infraestructura:_ `routeService.ts`, `usePlanStore.ts`.
  - _Presentación:_ `CreateRouteView`, `PlanEditorView`, `DraftsView`.
  - _Suites:_ `src/tests/plan_hu7.test.ts`, `src/tests/track_formats_hu7_hu8.test.ts`.

---

## HU-08: Grabar Ruta con GPS — 🟢 85% funcional

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** montañista **quiero** registrar el trayecto con GPS **para** medir distancia real, paradas y exportar una ruta auténtica.
- **Criterios de Aceptación (DoD):**
  1. ✅ Muestreo lat/lng/alt + `cleanTrack` (jitter/saltos) + descarte `accuracy > 25 m`.
  2. ✅ Checkpoints con 7 categorías Zod + alta manual (`AddCheckpointModal`) en la posición GPS.
  3. ✅ Resumen: distancia, ritmo, velocidad, desnivel; persistencia local/Firestore.
  4. ✅ Exportación GPX 1.1 desde el resumen (`ExportTrackFile` + share/descarga).
  5. ✅ Protección Firestore Anti-Colapso: actividades con >500 puntos en `points/{chunkIndex}`.
  6. ⚠️ Grabación con pantalla apagada (background location task).
  7. ✅ Handoff HU-07→HU-08: `ReadyForGpsView` inicia GPS (`StartRecordingFromPlan` + `TrackingView` High).
- **Estado real y brecha (15%):** se puede planificar, iniciar GPS en primer plano, marcar paradas, finalizar y exportar GPX. Falta background con pantalla apagada.
- **Mapeo Técnico:**
  - _Dominio:_ `activity.schemas.ts`, `calculations.ts`, `src/core/domain/trackFormats.ts` (`toGeoJSON`, `buildGPX11`).
  - _Aplicación:_ `StartRecordingFromPlan`, `AddCheckpoint`, `RecordPoint`, `FinishActivity`, `ExportTrackFile`.
  - _Infraestructura:_ `activityService.ts`, `locationService.ts` (`RECORDING_WATCH_OPTIONS`).
  - _Presentación:_ `RecordView` → `TrackingView` / `ResultView`, `AddCheckpointModal`.
  - _Suites:_ `src/tests/activity_hu8.test.ts`, `src/tests/track_formats_hu7_hu8.test.ts`.

---

## HU-09: Moderación — 🚫 ELIMINADA

Sin `moderator` en `UserRole`, `firestore.rules` ni dominio. Revisión = admin.

---

## HU-10: Gestionar Usuarios y Roles — 🟢 90% funcional

- **Rol:** Administrador.
- **Narrativa:** **Como** admin **quiero** listar, detallar, bloquear/desbloquear y cambiar roles con bitácora **para** asegurar la plataforma.
- **Criterios de Aceptación (DoD):**
  1. ✅ "Gestión Usuarios" visible y accesible solo si `role === 'admin'`.
  2. ✅ Filtros texto + estado (`Todos/Activos/Bloqueados`) + rol (`Todos/Usuarios/Admins`) con `UserFiltersSchema`.
  3. ✅ `UserDetailView`: UID, nombre, alias, correo, rol, estado de bloqueo, fecha de registro.
  4. ✅ Bloqueo/desbloqueo con modal de confirmación y registro en `accountLogs`; anti-autobloqueo.
  5. ✅ Cambio de roles solo `user`↔`admin` con registro de rol previo y nuevo en auditoría.
  6. ✅ `accountLogs` inmutable en `firestore.rules` con `actorId === auth.uid`.
- **Estado real y brecha (10%):** RBAC y auditoría 100% funcionales. Falta paginación por cursor si la lista de usuarios supera 50.
- **Mapeo Técnico:**
  - _Dominio:_ `userManagement.schemas.ts`, `AccountLogEntry` en `types.ts`.
  - _Aplicación:_ `ListUsers`, `GetUserDetail`, `BlockUser`, `UnblockUser`, `AssignRole`.
  - _Infraestructura:_ `accountLogService.ts`, `isAdmin()` en `firestore.rules`.
  - _Presentación:_ `UserManagementView`, `UserCard`, `UserDetailView`, `ConfirmActionModal`.
  - _Suite:_ `src/tests/user_management_hu10.test.ts`.

---

## Matriz de Estado Real y Suites

| HU        | Módulo               | Estado real | Suite Automatizada                                       |
| :-------- | :------------------- | :---------: | :------------------------------------------------------- |
| **HU-01** | Registro             |   🟢 95%    | `auth_hu1_hu2.test.ts`                                   |
| **HU-02** | Sesión y perfil      |   🟢 90%    | `auth_hu1_hu2.test.ts`                                   |
| **HU-03** | Explorar y mapa      |   🟢 90%    | `map_service_hu3.test.ts` (geoBounds) + TrekMap MapLibre |
| **HU-04** | Descarga offline     |   🟡 60%    | `offline_hu4.test.ts` + `map_pack_formats.test.ts`       |
| **HU-05** | Compartir ruta       |   🟢 85%    | `share_hu5.test.ts`                                      |
| **HU-06** | Realizar ruta (guía) |   🟡 70%    | `activity_hu6.test.ts`                                   |
| **HU-07** | Planificar borrador  |   🟢 85%    | `plan_hu7.test.ts` + `track_formats_hu7_hu8.test.ts`     |
| **HU-08** | Grabar GPS y GPX     |   🟢 85%    | `activity_hu8.test.ts` + `track_formats_hu7_hu8.test.ts` |
| **HU-09** | Moderación           |    🚫 —     | Eliminada del alcance                                    |
| **HU-10** | Admin y roles        |   🟢 90%    | `user_management_hu10.test.ts`                           |

### Comandos Canónicos de Verificación

```bash
npm run lint   # tsc --noEmit — DEBE quedar en 0 errores
npm test       # 9 suites automáticas en serie (>95 casos de prueba en verde)
npx expo-doctor # obligatorio antes de tocar dependencias o permisos nativos
```
