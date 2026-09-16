# trekkin-app — Historias de Usuario (Figura Oficial del Equipo)

> **Revisión técnica 2026-09-15 (auditoría doc vs código).**
> Regla de validación vigente: **100% solo con matriz Expo Go + dev-build completa + `/ui-review` sin blockers + OK del usuario**. Todo lo demás declara su % real.
>
> **Modelo de mapa en dos capas (aplica a HU-03/04/06/07/08):**
> - **Capa Usuario:** GPX (canónico) ↔ GeoJSON (render) | KML/KMZ/TCX/CSV/PLT/FIT solo import. Guarda la línea, waypoints, altitud y tiempo. Sin mapa base se dibuja sobre gris.
> - **Capa Base:** vector tiles MBTiles/PMTiles + style JSON (OpenFreeMap, sin keys). Ríos, calles, curvas de nivel. Nada de carpetas PNG ni teselas en AsyncStorage.
>
> **Alcance real:**
> - **🟢 Sólidas (≥85%):** HU-01, HU-02, HU-05, HU-10.
> - **🟡 Parciales (50–70%, bloqueadas por mapa/offline):** HU-03, HU-06, HU-07, HU-08.
> - **🔴 No funcional como offline real:** HU-04 (35%).
> - **🚫 HU-09 eliminada.** Roles vigentes: `user` y `admin`.

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
  - *Dominio:* `src/core/domain/auth.schemas.ts` (`RegisterSchema`, `UserProfileSchema`).
  - *Aplicación:* `src/core/application/auth/RegisterUser.usecase.ts`.
  - *Infraestructura:* `src/infrastructure/database/userProfileService.ts`, Firebase Auth + Firestore (`users/{uid}`).
  - *Presentación:* `src/presentation/views/auth/RegisterForm.tsx`, `AuthView.tsx`.

---

## HU-02: Sesión, Perfil e Identidad — 🟢 90% (refinamiento)

- **Rol:** Usuario registrado / Administrador.
- **Narrativa:** **Como** usuario registrado **quiero** gestionar mi sesión, consultar mi perfil y actualizar mis datos **para** mantener mi identidad al día y visualizar mis métricas.
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
  10. ⚠️ `ProfileView`: muestra avatar, alias, rol, métricas (`summitsCount`, Km, rutas) y correo solo lectura. Pendiente: cambio de contraseña y preferencia de tema cableados a backend.
  11. ✅ `EditProfileView`: edita `displayName`/`username` con `UpdateProfileSchema` (3–150 / regex `/^[a-zA-Z0-9_.]+$/`), email solo lectura, sin teléfono (alcance/privacidad), Guardar/Descartar.
- **Estado real y brecha (10%):** auth sólida. Falta cerrar acciones de `ProfileView` (password/theme) y matriz dev-build.
- **Mapeo Técnico:**
  - *Dominio:* `LoginSchema`, `UpdateProfileSchema` en `src/core/domain/auth.schemas.ts`; `UserProfile` en `types.ts`.
  - *Aplicación:* `LoginUser` / `LogoutUser` / `UpdateUserProfile` usecases.
  - *Infraestructura:* `src/infrastructure/auth/AuthContext.tsx`, `userProfileService.ts`.
  - *Presentación:* `LoginForm.tsx`, `HomeView.tsx`, `ProfileView.tsx`, `EditProfileView.tsx`.

---

## HU-03: Explorar y Consultar Rutas — 🟡 70% (bloqueada por mapa base)

- **Rol:** Visitante / Senderista.
- **Narrativa:** **Como** senderista o visitante **quiero** explorar el catálogo público, buscar y ver el detalle técnico con mapa **para** evaluar la excursión antes de salir.
- **Criterios de Aceptación (DoD):**
  1. ✅ Guest libre: `ExploreView` es la entrada; catálogo + detalle públicos.
  2. ✅ Búsqueda texto + chips dificultad (`Todas/Fácil/Moderado/Difícil/Experto`) con `RouteFiltersSchema`.
  3. ✅ `RouteCard`: nombre, tramo inicio→fin, km, horas, badge dificultad, `photos[0]` con fallback.
  4. ✅ `RouteDetailView`: header andino, badge desnivel, métricas (distancia/desnivel/tiempo/modalidad), itinerario, checkpoints con categoría/notas.
  5. ❌ Mapa base vectorial offline: hoy `PlanMap` (slippy raster propio `View/Image/PanResponder` + SVG) golpea `tile.openstreetmap.org` → **403 en celular** (`<Image>` no envía `User-Agent`; viola Tile Usage Policy que prohíbe bulk/prefetch). Solo ~85 PNGs La Paz z9–12 en `assets/tflat/` (~1 MB); fuera de eso o en z13–19 = placeholder gris. `react-native-maps@1.27.2` declarado pero sin uso. **Destino: `TrekMap` MapLibre + style OpenFreeMap (sin keys) + GeoJSON.**
  6. ✅ Gate amigable: acciones con sesión abren `AuthView` cancelable sin perder contexto.
- **Estado real y brecha (30%):** catálogo/detalle/filtros OK. Mapa no es producción ni offline. Ver `docs/BACKLOG.md` F0–F1.
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/route.schemas.ts`.
  - *Aplicación:* `ListPublishedRoutes` / `SearchRoutes` / `GetRouteDetail` usecases.
  - *Infraestructura:* `src/infrastructure/database/routeService.ts`, `routeSeed.ts`. Destino: `src/infrastructure/map/mapStyle.ts` + `offlinePacks.ts`.
  - *Presentación:* `ExploreView.tsx`, `RouteCard.tsx`, `RouteDetailView.tsx`, `Drawer.tsx`. Destino: `components/map/TrekMap.tsx` (`PlanMap` queda solo fallback dev).

---

## HU-04: Descargar Ruta Offline — 🔴 35% (no es offline de mapas)

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** senderista sin cobertura **quiero** descargar ruta + mapa base **para** consultarla en campo sin internet.
- **Criterios de Aceptación (DoD):**
  1. ✅ Botón "Descargar ruta" en `RouteDetailView`.
  2. ⚠️ Estimación: hoy `JSON.stringify().length` + fórmula `4096 + area*5120` — arbitraria, no mide tiles. Destino: bbox × zooms 12–16 × ~30 KB vector.
  3. ❌ Guardado real: hoy 3 JSONs en AsyncStorage (`tileCacheDB.ts`) + teselas base64 en AsyncStorage (`tileCache.ts`, tope 1500 → ~50 MB teóricos vs límite ~6 MB Android = `QuotaExceeded` silencioso). Sin `expo-file-system`, sin MBTiles/PMTiles, sin progreso en bytes, sin resume/cancel/cuota/versionado. Destino: `OfflineManager.createPack({mapStyle, bounds, minZoom, maxZoom})` en DB nativa.
  4. ❌ Modo avión: `OfflineRouteMap` es esquema SVG (retícula + línea), no mapa. Destino: `NetworkManager.setConnected(false)` + pack = mapa+ruta visibles.
- **Estado real y brecha (65%):** flujo UI/existe, persistencia de mapa inexistente. Es la HU más sobrestimada del doc anterior.
- **Mapeo Técnico (actual → destino):**
  - Actual: `src/core/domain/offline.ts`, `DownloadRouteOffline` / `EstimateRouteDownloadSize` usecases, `tileCacheDB.ts`, `DownloadRouteModal.tsx`, `DownloadsView.tsx`.
  - Destino: `CreatePack/DeletePack/InvalidatePack` usecases + `offlinePacks.ts` (MapLibre) + `packSpec` en Firestore.

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
- **Estado real y brecha (15%):** flujo verificado. Falta: adjuntar `.gpx` al sheet y matriz dev-build. Futuro: compartir incluye pack offline disponible.
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/share.schemas.ts` (`SharePayloadSchema`, `parseShareLink`).
  - *Aplicación:* `ShareRoute` / `CopyShareLink` / `PublishShareLink` usecases.
  - *Infraestructura:* `src/infrastructure/share/shareService.ts`.
  - *Presentación:* `ShareModal.tsx`, `RouteDetailView.tsx`.

---

## HU-06: Realizar una Ruta Existente — 🟡 60% (guía sin base offline ni background)

- **Rol:** Senderista registrado.
- **Narrativa:** **Como** senderista en campo **quiero** seguir una ruta con GPS en vivo **para** guiarme por el trazado oficial, chequear checkpoints y guardar mi historial.
- **Criterios de Aceptación (DoD):**
  1. ⚠️ `PrepareView`: muestra ruta + GPS + distancia al inicio, pero con badge "PROVISIONAL · primera ruta" (catálogo HU-03 no enlazado) y `getCurrentPosition` sin umbral de accuracy.
  2. ⚠️ `TrackingView`: trazado oficial + posición + HUD (distancia/tiempo/restante) OK en foreground; sin follow-me, sin snap-to-route (`projectOnPolyline` existe en `calculations.ts` pero no se usa en vivo), sin off-route, sin círculo de accuracy. `fitTo` solo al montar.
  3. ✅ Checkpoints auto-visitados por radio (hoy 120 m fijo, generoso) + manual.
  4. ✅ Pausa/reanuda/finaliza con `completed`/`incomplete` + autosave local + Firestore al final. Sin subida incremental ni reintento real de `unsynced`; sin background (`expo-task-manager` + `ACCESS_BACKGROUND_LOCATION` ausentes → pantalla bloqueada corta el track; `Balanced` en vez de `High`).
- **Estado real y brecha (40%):** máquina de estados + métricas OK. Guía de campo real pendiente de F0/F3. Ver `docs/BACKLOG.md` F3.
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/activity.ts`, `activity.schemas.ts`, `calculations.ts`.
  - *Aplicación:* `Start/Begin/RecordPoint/Pause/Resume/Finish/List/GetActivity` usecases.
  - *Infraestructura:* `activityService.ts`, `locationService.ts`, `useActivityStore.ts`. Destino: tracking sobre `TrekMap` + task background.
  - *Presentación:* `ActivityView/PrepareView/TrackingView/ResultView/HistoryView/ActivityDetailView`.

---

## HU-07: Planificar Nueva Ruta (Borrador) — 🟡 70% (borrador OK, mapa e import pendientes)

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** explorador **quiero** trazar puntos provisionales y guardar borrador **para** consolidar datos antes de la expedición.
- **Criterios de Aceptación (DoD):**
  1. ✅ Acceso desde Drawer / `HomeView`.
  2. ✅ Nombre provisional obligatorio.
  3. ⚠️ Taps en `PlanMap` fijan inicio (verde)/destino (ámbar); sin undo/clear/drag, tap frágil (`measureInWindow`+`PanResponder` vs `ScrollView`).
  4. ✅ Dual: Firestore `routes/{id}` `status:'draft'` + autosave Zustand/AsyncStorage.
  5. ✅ `DraftsView` + `PlanEditorView` (listar/editar metadatos).
  6. ⚠️ Confirmación GPS del inicio con `expo-location`, sin accuracy visible. Pendiente: `ImportTrackFile` (GPX/KML/KMZ/CSV/PLT) como punto de partida.
- **Estado real y brecha (30%):** CRUD borrador sólido; edición geométrica e import pendientes.
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/plan.ts`, `plan.schemas.ts`. Destino: `trackFormats.ts`.
  - *Aplicación:* `SaveDraft/GetDraft/UpdatePlan/ConfirmStartPoint/MarkReadyForGps`. Destino: `ImportTrackFile`.
  - *Infraestructura:* `routeService.ts`, `usePlanStore.ts`. Destino: `trackFileService.ts` (`expo-document-picker`).
  - *Presentación:* `RecordView/CreateRouteView/PlanEditorView/DraftsView`.

---

## HU-08: Grabar Ruta con GPS — 🟡 60% (registro OK, exportación y fondo pendientes)

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** montañista **quiero** registrar el trayecto con GPS **para** medir distancia real, paradas y publicar una ruta auténtica.
- **Criterios de Aceptación (DoD):**
  1. ⚠️ Permiso foreground con justificación OK; precisión reportada pero sin umbral de descarte (`accuracy<25 m` pendiente) ni `High`.
  2. ✅ Muestreo lat/lng/alt + `cleanTrack` (jitter/saltos). Pendiente filtro altimetría.
  3. ✅ Checkpoints con categoría Zod (agua/camping/peligro/vista/descanso/flora_fauna/refugio) + notas vía `AddCheckpointUseCase`.
  4. ⚠️ Resumen (distancia/tiempo/ritmo/velocidad/desnivel) + persistencia local/Firestore OK; **sin export `.gpx`** (criterio real de "ruta auténtica" para Garmin/Wikiloc). TCX/FIT redundantes sin pulsómetro: solo import opcional.
- **Estado real y brecha (40%):** graba bien en foreground; le falta fondo + GPX.
- **Mapeo Técnico:**
  - *Dominio:* `activity.schemas.ts`, `calculations.ts`. Destino: `trackFormats.ts` (`buildGPX11`).
  - *Aplicación:* `AddCheckpoint/RecordPoint/FinishActivity`. Destino: `ExportTrackFile`.
- *Infraestructura:* `locationService.ts` (opciones de precisión: `High` para grabación, defaults `Balanced` intactos), `useActivityStore.ts`. Destino: `expo-sharing`/`Share`.
- *Presentación:* `TrackingView.tsx`, `ResultView.tsx`. `formatPace` en `presentation/utils/format.ts`.
- *Evidencia rescate cruz→main (2026-09-16):* `calculateTrackDistanceKm` / `calculateRemainingDistanceKm` / `suggestRouteDifficulty` en `core/domain/calculations.ts` (aditivos, sin romper `calculateTotalDistanceKm` filtrado ni `calculatePaceMinPerKm: string`). No se traen las vistas `Recording/Summary` (745/391 líneas, violan vista delgada) ni el cambio rompedor de firma. Suite `activity_hu8.test.ts` intacta.

---

## HU-09: Moderación — 🚫 ELIMINADA

Sin `moderator` en `UserRole`, `firestore.rules` ni dominio. Revisión = admin. Sin cambios.

---

## HU-10: Gestionar Usuarios y Roles — 🟢 90% funcional

- **Rol:** Administrador.
- **Narrativa:** **Como** admin **quiero** listar, detallar, bloquear/desbloquear y cambiar roles con bitácora **para** asegurar la plataforma.
- **Criterios de Aceptación (DoD):**
  1. ✅ "Gestión Usuarios" solo si `role === 'admin'`.
  2. ✅ Filtros texto + estado (`Todos/Activos/Bloqueados`) + rol (`Todos/Usuarios/Admins`, sin moderador) con `UserFiltersSchema`.
  3. ✅ `UserDetailView`: UID, nombre, alias, correo, rol, bloqueo, registro.
  4. ✅ Bloqueo/desbloqueo con `ConfirmActionModal` + `accountLogs`; anti-autobloqueo; idempotencia.
  5. ✅ Roles solo `user`↔`admin`; anti-lockout propio; auditoría `previousRole/newRole`.
  6. ✅ `accountLogs` inmutable, solo admin, `actorId === auth.uid`.
- **Estado real y brecha (10%):** RBAC + bitácora verificados. Falta paginación/cursor en lista grande y matriz dev-build.
- **Mapeo Técnico:**
  - *Dominio:* `userManagement.schemas.ts`, `AccountLogEntry` en `types.ts`.
  - *Aplicación:* `ListUsers/GetUserDetail/BlockUser/UnblockUser/AssignRole`.
  - *Infraestructura:* `accountLogService.ts`, `isAdmin()` en `firestore.rules`.
  - *Presentación:* `UserManagementView/UserCard/UserDetailView/ConfirmActionModal`.

---

## Matriz de Estado Real y Suites

| HU | Módulo | Estado real | Suite |
| :--- | :--- | :---: | :--- |
| HU-01 | Registro | 🟢 95% | `auth_hu1_hu2.test.ts` |
| HU-02 | Sesión/perfil | 🟢 90% | `auth_hu1_hu2.test.ts` |
| HU-03 | Explorar | 🟡 70% | catálogo/detalle OK; mapa 403 |
| HU-04 | Offline | 🔴 35% | `offline_hu4.test.ts` (estima/descarga JSON, no tiles) |
| HU-05 | Compartir | 🟢 85% | `share_hu5.test.ts` |
| HU-06 | Realizar | 🟡 60% | `activity_hu6.test.ts` (máquina/GPS/historial, sin fondo) |
| HU-07 | Planificar | 🟡 70% | `plan_hu7.test.ts` |
| HU-08 | Grabar GPS | 🟡 60% | `activity_hu8.test.ts` |
| HU-09 | Moderación | 🚫 — | N/A |
| HU-10 | Admin/roles | 🟢 90% | `user_management_hu10.test.ts` |

```bash
npm run lint   # tsc --noEmit — 0 errores para cerrar
npm test       # 7 suites en serie (120 casos)
npx expo-doctor # obligatorio si tocas app.json/nativas/permisos
```
