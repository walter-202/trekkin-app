# trekkin-app — Historias de Usuario (Figura Oficial del Equipo)

> **Revisión técnica consolidada 2026-09-16 (Post-Desbloqueo de Mapas y Firestore).**
> Regla de validación vigente: **100% solo con matriz Expo Go + dev-build completa + `/ui-review` sin blockers + OK del usuario**. Todo lo demás declara su % real.
>
> **Alcance real consolidado:**
> - **🟢 Sólidas (≥80%):** HU-01 (95%), HU-02 (90%), HU-03 (90%), HU-05 (85%), HU-07 (100%), HU-08 (80%), HU-10 (90%).
> - **🟡 En progreso / pendientes de campo:** HU-06 (65%), HU-04 (55%).
> - **🚫 HU-09 eliminada.** Roles vigentes: `user` y `admin`.

---

## 🧭 Guía Técnica para Desarrolladores y Agentes: Qué Usar (Canónico)

Para evitar duplicaciones, componentes obsoletos o reescrituras innecesarias, todos los agentes y desarrolladores **DEBEN** ceñirse a estos estándares técnicos:

## HU-01: Registrar Cuenta — ✅ 100% implementada
- **Como** visitante **quiero** registrar una cuenta **para** acceder a la plataforma.
- Criterios:
  1. Formulario "Registrarse" (`AuthView`, modo `register`).
  2. Campos: Nombre Completo, Correo, Usuario, Contraseña, Confirmar Contraseña,
     Aceptación de Normas de Seguridad en Montaña.
  3. Validación `RegisterSchema` (zod): email válido, pass ≥ 8, confirmación igual,
     términos aceptados, usuario único (Firebase Auth lanza error si el correo existe).
  4. Rol automático `user` (`RegisterUserUseCase`).
  5. Mensaje de confirmación ("¡Cuenta creada exitosamente!").
  6. Redirección a login (HU-02).
- Archivos: `core/domain/auth.schemas.ts`, `core/application/auth/RegisterUser.usecase.ts`
  (sin `saveSession`: HU-01 C6 no crea sesión),
  `infrastructure/auth/AuthContext.tsx` (`register(args)` delega al usecase + `signOut`
  tras crear la cuenta; `isNetworkError`: fallbacks locales solo con error de red;
  duplicados, claves débiles y errores Zod se propagan),
  `infrastructure/database/userProfileService.ts`,
  `presentation/views/auth/AuthView.tsx` (compositor; éxito de registro → modo `login`
  con "¡Cuenta creada exitosamente! Ahora inicia sesión.") +
  `presentation/views/auth/LoginForm.tsx` / `RegisterForm.tsx` (forms colocalizados con Zod;
  `RegisterForm` pasa los 6 campos al contexto) +
  primitivas `presentation/components/ui/` (`Field`, `Button`, `Banner`).
- Nota: `SEED_ADMIN_ACCOUNTS` / `switchDemoRole` / Google quedan aislados como demo
  fuera de criterios; el arranque es sin sesión (`currentUser = null`) y el Gate
  solo muestra `AuthView` hasta login real.

## HU-02: Iniciar y Cerrar Sesión — ✅ 100% implementada
- **Como** usuario registrado **quiero** iniciar/cerrar sesión **para** usar la plataforma.
- Criterios:
  1. Acceso desde `AuthView` (modo `login`) o trigger contextual.
  2. Correo + contraseña de HU-01.
  3. Contraseña oculta con toggle `Eye`/`EyeOff`.
  4. Validación `LoginSchema` + mensajes descriptivos.
  5. Credenciales válidas → sesión + redirección según rol (RBAC: `hasRole`, `isAdmin`).
  6. Credenciales inválidas → error, sin sesión.
  7. Sesión persistente (`storage.ts`, clave `trekkin_auth_user`, AsyncStorage).
  8. Rutas privadas protegidas (`Gate` en `App.tsx`).
  9. Usuario activo visible (avatar, nombre verificado, badge de rol en `HomeView`).
  10. Cierre seguro (`LogoutUserUseCase` + botón Salir).
- Archivos: `core/application/auth/LoginUser.usecase.ts`, `LogoutUser.usecase.ts`,
  `AuthContext.tsx` (`login()` / `logout()` delegan a los usecases con puertos Firebase +
  `storage`; `isBlocked` bloquea sesión en login y en `onAuthStateChanged`; fallbacks
  solo por red; `logout()` vía `LogoutUserUseCase`, `onAuthStateChanged`,
  `subscribeToUserProfile`), `presentation/views/home/HomeView.tsx`,
  `presentation/views/auth/AuthView.tsx` (compositor) +
  `presentation/views/auth/LoginForm.tsx` (valida con `LoginSchema`).

## HU-07: Planificar una nueva ruta — ✅ 100% implementada
- **Como** usuario autenticado **quiero** guardar una ruta como borrador **para**
  continuar planificando después y confirmar el punto inicial real.
- Criterios:
  1. "Crear nueva ruta" desde el hub (`HomeView` → `RecordView`).
  2. Mapa interactivo (`@maplibre/maplibre-react-native` + tiles OpenStreetMap, componente único `PlanMap`).
  3. Punto inicial provisional + destino provisional (taps en el mapa, `PlanPointPicker`).
  4. Guardar como borrador (`SaveDraftUseCase` → `routes/{id}` con `status:'draft'`).
  5. Autosave local (`usePlanStore` + AsyncStorage `trekking_plan_autosave`) → no se pierde al salir.
  6. Recuperar borrador (`DraftsView` + `GetDraftUseCase`).
  7. Modificar antes de iniciar (`PlanEditorView` + `UpdatePlanUseCase`).
  8. Confirmar/modificar punto inicial real con ubicación actual (`expo-location`,
     `StartPointConfirmView` + `ConfirmStartPointUseCase`).
  9. El sistema actualiza el punto inicial confirmado (`startPointConfirmed` local + `startPoint` en Firestore).
  10. Ruta lista para grabación GPS (`MarkReadyForGpsUseCase` → `status:'ready_for_gps'`,
      handoff a HU-08, `ReadyForGpsView`).
- Arquitectura: `core/domain/plan.ts` + `plan.schemas.ts` (zod), 8 use cases en
  `core/application/plan/` (puertos inyectados, sin Firebase/RN), `routeService.ts`
  (única capa que importa `firebase/firestore`), `usePlanStore.ts` (zustand + autosave),
  vistas delgadas en `presentation/views/record/`. La vista no importa `firebase/*`.
- Seguridad: `firestore.rules` ya cubre crear/actualizar borradores del creador
  (`status:'draft'`); `startPointConfirmed` se conserva localmente (no es key permitida).
- Feedback del equipo aplicado: el **nombre provisional de la ruta** es obligatorio y se rellena
  al crear (`CreateRouteView`, campo "NOMBRE PROVISIONAL DE LA RUTA *", arriba de punto inicial y
  destino); sin nombre no se guarda el borrador. Misma etiqueta en el editor (`PlanEditorView`).
- Mapa **100% nativo, sin Google** (`@maplibre/maplibre-react-native`, `PlanMap.tsx`): tiles
  OpenStreetMap (raster source), tap reporta coordenadas y marcadores para inicio provisional,
  destino y ubicación actual. Sin WebView ni capa de HTML/DOM (regla nativa de AGENTS.md).
- **Offline**: MapLibre cachea los tiles ya vistos (caché ambiente, `setTileCountLimit`), de modo
  que el mapa sigue funcionando sin internet en las zonas navegadas previamente. La descarga
  explícita de regiones queda en HU-04 (roadmap).
- **Dev builds**: Expo Go ya no incluye ningún mapa nativo (ni Google Maps ni MapLibre,
  `expo/expo#49323`); el mapa se prueba con build de desarrollo (`npx expo run:android` /
  `npx expo run:ios` o `eas build`) en Android e iOS.
- Dependencias nuevas: `@maplibre/maplibre-react-native` (mapa nativo, config plugin en `app.json`)
  + `expo-location` (T8). Se retiraron `react-native-maps` y `react-native-webview`.
- Verificación: `npm run lint` (0 errores) y flujo T11–T20 con dev build (Android o iOS).

### 1. Mapas e Interfaz Visual (V1 Expo Go)
- **Componente Único de Mapa:** Usar [`src/presentation/components/map/TrekMap.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/components/map/TrekMap.tsx) con el contrato de props [`TrekMapProps`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/components/map/TrekMap.types.ts).
  - En **iOS:** Apple Maps nativo (automático, 100% gratuito, 0 API keys).
  - En **Android / Expo Go:** OpenStreetMap libre vía `<UrlTile />` (0 API keys de Google, sin errores 403).
  - **PROHIBIDO:** Usar `PlanMap.tsx`, `OfflineRouteMap.tsx`, WebViews innecesarias o implementar renderizadores caseros de teselas con `<Image>`.
- **Catálogo de Rutas (HU-03 Lista):**
  - La tarjeta de ruta [`RouteCard.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteCard.tsx) renderiza la foto de portada subida por los usuarios (`route.coverImageUrl || route.photos?.[0]`) o el placeholder andino.
  - **CERO llamadas o inicializaciones de mapas en el feed/catálogo**. Carga instantánea a 60 FPS.

### 2. Formatos GPS y Cálculos Geográficos
- **Parsers y Serializadores:** [`src/core/domain/trackFormats.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/trackFormats.ts).
  - `parseGPX(xml)`: extrae trackpoints, elevación, tiempos y waypoints.
  - `buildGPX(track)`: genera XML GPX 1.1 canónico (interoperable con Garmin, Strava y Wikiloc).
  - `parseKML(kml)`, `parseCSV(csv)`: importación de formatos abiertos.
  - `simplifyTrack(points, toleranceM)`: algoritmo de **Ramer-Douglas-Peucker** para aligerar tracks densos.
- **Bounding Box y Estimación:** [`src/core/domain/geoBounds.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/geoBounds.ts).
  - `computeBoundingBox(points, padding)`: calcula límites de encuadre geográfico.
  - `boundsToRegion(bounds)`: genera deltas para la cámara del mapa.
  - `estimateTileCount(bounds, minZ, maxZ)` y `estimateDownloadSizeMB(count)`: cálculo matemático real de descarga.
- **Casos de Uso:**
  - Importar archivo de ruta (HU-07): [`ImportTrackFileUseCase`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/plan/ImportTrackFile.usecase.ts).
  - Exportar actividad a GPX (HU-08): [`ExportTrackFileUseCase`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/activity/ExportTrackFile.usecase.ts).

| ID | Historia | Ruta futura | Estado |
|---|---|---|---|
| HU-03 | Explorar y consultar ruta | `views/explore/ExploreView.tsx` (genérica en blanco) + `routeService` | scaffold + guest (criterios los define el otro dev) |
| HU-04 | Descarga offline | `persistence/tileCacheDB` | scaffold |
| HU-05 | Compartir ruta publicada | modal en explore | scaffold |
| HU-06 | Realizar ruta (actividad GPS) | `views/activity/` + `activityService` | scaffold |
| HU-08 | Grabar ruta con GPS | `views/record/` + `expo-location` (lee `ready_for_gps` de HU-07) | scaffold |
| HU-10 | Gestionar usuarios y roles (admin) | `views/profile/` RBAC | scaffold |

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

## HU-03: Explorar y Consultar Rutas — 🟢 90% funcional

- **Rol:** Visitante / Senderista.
- **Narrativa:** **Como** senderista o visitante **quiero** explorar el catálogo público, buscar y ver el detalle técnico con mapa **para** evaluar la excursión antes de salir.
- **Criterios de Aceptación (DoD):**
  1. ✅ Guest libre: `ExploreView` es la entrada; catálogo + detalle públicos.
  2. ✅ Búsqueda texto + chips dificultad (`Todas/Fácil/Moderado/Difícil/Experto`) con `RouteFiltersSchema`.
  3. ✅ `RouteCard`: nombre, tramo inicio→fin, km, horas, badge dificultad, foto de portada real del usuario (`coverImageUrl || photos[0]`) sin peticiones de mapas.
  4. ✅ `RouteDetailView`: header andino, badge desnivel, métricas (distancia/desnivel/tiempo/modalidad), itinerario, checkpoints con categoría/notas.
  5. ✅ Mapa nativo con `TrekMap.tsx`: implementado sobre `react-native-maps` nativo (Apple Maps en iOS y OpenStreetMap en Android sin WebViews ni errores 403 de OSM). Polyline verde esmeralda y marcadores de inicio/fin/checkpoints nítidos.
  6. ✅ Paginación y control de carga: `routeService.listPublishedRoutesPaginated` para consumo eficiente de Firestore.
  7. ✅ Gate amigable: acciones protegidas (descarga/tracking) invitan a sesión sin perder contexto.
- **Estado real y brecha (10%):** visualización y catálogo completamente operativos. Pendiente: pruebas en matriz física multi-dispositivo.
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/route.schemas.ts`, `src/core/domain/geoBounds.ts`.
  - *Aplicación:* `ListPublishedRoutes` / `SearchRoutes` / `GetRouteDetail` usecases.
  - *Infraestructura:* `src/infrastructure/database/routeService.ts`, `routeSeed.ts`.
  - *Presentación:* `ExploreView.tsx`, `RouteCard.tsx`, `RouteDetailView.tsx`, `src/presentation/components/map/TrekMap.tsx`.
  - *Suite:* `src/tests/map_service_hu3.test.ts`.

---

## HU-04: Descargar Ruta Offline — 🟡 55% en progreso

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** senderista sin cobertura **quiero** descargar ruta + mapa base **para** consultarla en campo sin internet.
- **Criterios de Aceptación (DoD):**
  1. ✅ Botón "Descargar ruta" en `RouteDetailView` activo y enlazado a `DownloadRouteModal`.
  2. ✅ Estimación matemática real: cálculo de teselas y MB por bounding box y niveles de zoom (12–15) vía `geoBounds.ts` (`estimateTileCount` y `estimateDownloadSizeMB`).
  3. ⚠️ Guardado de datos y mapa: guarda JSONs del trazado y waypoints. Pendiente completar la descarga masiva de teselas físicas a `expo-file-system` (`/offline_packs/{routeId}/`).
  4. ⚠️ Modo avión: `TrekMap` soporta prop `offlinePackPath` para leer teselas locales (`file://...`). Pendiente verificación física en dispositivo sin red.
- **Estado real y brecha (45%):** lógica de estimación, modal y soporte de teselas locales en `TrekMap` listos. Falta completar el gestor de descarga masiva a disco (`tileDownloader.ts`).
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/offline.ts`, `src/core/domain/geoBounds.ts`.
  - *Aplicación:* `DownloadRouteOffline` / `EstimateRouteDownloadSize` usecases.
  - *Infraestructura:* `src/infrastructure/persistence/tileCacheDB.ts`. Destino: `expo-file-system`.
  - *Presentación:* `DownloadRouteModal.tsx`, `DownloadsView.tsx`.
  - *Suite:* `src/tests/offline_hu4.test.ts`.

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
  - *Dominio:* `src/core/domain/share.schemas.ts`, `src/core/domain/trackFormats.ts`.
  - *Aplicación:* `ShareRoute` / `CopyShareLink` / `PublishShareLink` / `ExportTrackFile` usecases.
  - *Infraestructura:* `src/infrastructure/share/shareService.ts`.
  - *Presentación:* `ShareModal.tsx`, `RouteDetailView.tsx`.
  - *Suite:* `src/tests/share_hu5.test.ts`.

---

## HU-06: Realizar una Ruta Existente — 🟡 65% en progreso

- **Rol:** Senderista registrado.
- **Narrativa:** **Como** senderista en campo **quiero** seguir una ruta con GPS en vivo **para** guiarme por el trazado oficial, chequear checkpoints y guardar mi historial.
- **Criterios de Aceptación (DoD):**
  1. ⚠️ `PrepareView`: muestra ruta + GPS + distancia al inicio.
  2. ⚠️ `TrackingView`: trazado oficial + posición + HUD (distancia/tiempo/restante) en foreground. Pendiente migrar al nuevo `<TrekMap />` nativo.
  3. ✅ Checkpoints auto-visitados por proximidad (`isNearM`) + manual.
  4. ✅ Pausa/reanuda/finaliza con `completed`/`incomplete` + autosave local + guardado en Firestore.
  5. ⚠️ Background GPS: pantalla bloqueada requiere configurar `expo-task-manager` y `ACCESS_BACKGROUND_LOCATION`.
- **Estado real y brecha (35%):** lógica de estados y métricas 100% probada. Falta migrar vista de tracking a `TrekMap` nativo y background task.
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/activity.ts`, `activity.schemas.ts`, `calculations.ts`.
  - *Aplicación:* `Start/Begin/RecordPoint/Pause/Resume/Finish/List/GetActivity` usecases.
  - *Infraestructura:* `activityService.ts`, `locationService.ts`, `useActivityStore.ts`.
  - *Presentación:* `ActivityView`, `PrepareView`, `TrackingView`, `ResultView`, `HistoryView`.
  - *Suite:* `src/tests/activity_hu6.test.ts`.

---

## HU-07: Planificar Nueva Ruta (Borrador) — 🟢 100% funcional

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** explorador **quiero** trazar puntos provisionales o importar un archivo de ruta **para** consolidar datos antes de la expedición.
- **Criterios de Aceptación (DoD):**
  1. ✅ Acceso desde Drawer / `HomeView`.
  2. ✅ Nombre provisional obligatorio.
  3. ✅ Trazado interactivo de waypoints sobre mapa nativo con callbacks de coordenadas.
  4. ✅ Importación de archivos externos: `ImportTrackFileUseCase` listo para parsear `.gpx`, `.kml` y `.csv` con simplificación Ramer-Douglas-Peucker automática.
  5. ✅ Dual: Firestore `routes/{id}` `status:'draft'` + autosave Zustand/AsyncStorage.
  6. ✅ `DraftsView` + `PlanEditorView` (listar y editar borradores).
  7. ✅ Edición geométrica fina: undo/clear/drag de puntos individuales en UI — historial de 10 snapshots, marcadores de waypoints intermedios arrastrables (púrpura), botones flotantes Undo/Clear en el mapa, tab "PTS" con lista de gestión.
- **Estado real y brecha (0%):** todos los criterios funcionales completos. Persistencia, modelo, importación, drag de waypoints, undo/clear y tests unitarios verificados (33 pruebas HU-07).
- **Mapeo Técnico:**
  - *Dominio:* `src/core/domain/plan.ts` (`PlanHistoryEntry`, `MAX_UNDO_HISTORY`), `plan.schemas.ts` (`AddWaypointSchema`, `RemoveWaypointSchema`, `MoveWaypointSchema`), `src/core/domain/trackFormats.ts`.
  - *Aplicación:* `SaveDraft`, `GetDraft`, `UpdatePlan`, `ConfirmStartPoint`, `MarkReadyForGps`, `ImportTrackFile`.
  - *Infraestructura:* `routeService.ts`, `usePlanStore.ts` (acciones: `addWaypoint`, `removeWaypoint`, `moveWaypoint`, `undo`, `clearWaypoints`, `canUndo` + historial).
  - *Presentación:* `CreateRouteView`, `PlanEditorView`, `DraftsView`, `PlanPointPicker.tsx` (tab waypoints + lista), `PlanMap.tsx` (drag de marcadores + botones undo/clear).
  - *Suites:* `src/tests/plan_hu7.test.ts` (33 pruebas, 12 nuevas para C7), `src/tests/track_formats_hu7_hu8.test.ts`.

---

## HU-08: Grabar Ruta con GPS — 🟢 80% funcional

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** montañista **quiero** registrar el trayecto con GPS **para** medir distancia real, paradas y exportar una ruta auténtica.
- **Criterios de Aceptación (DoD):**
  1. ✅ Muestreo lat/lng/alt + `cleanTrack` (descarte de jitter y saltos erróneos).
  2. ✅ Checkpoints con 7 categorías Zod (agua, camping, peligro, vista, descanso, flora_fauna, refugio) + notas.
  3. ✅ Resumen de métricas: distancia, ritmo (`formatPace`), velocidad promedio y cálculo de desnivel acumulado (+/-).
  4. ✅ Exportación a formato GPX 1.1: `ExportTrackFileUseCase` genera archivo canónico interoperable con Garmin, Strava y Wikiloc.
  5. ✅ Protección Firestore Anti-Colapso: actividades con >500 puntos se guardan particionadas en subcolección `points/{chunkIndex}` evitando superar límites de 1 MB.
  6. ⚠️ Grabación con pantalla apagada (background location task).
- **Estado real y brecha (20%):** registro, métricas, particionamiento y exportación GPX listos. Falta habilitar el background task.
- **Mapeo Técnico:**
  - *Dominio:* `activity.schemas.ts`, `calculations.ts`, `src/core/domain/trackFormats.ts`.
  - *Aplicación:* `AddCheckpoint`, `RecordPoint`, `FinishActivity`, `ExportTrackFile`.
  - *Infraestructura:* `activityService.ts` (con `saveActivityPointsChunks`), `locationService.ts`.
  - *Presentación:* `TrackingView.tsx`, `ResultView.tsx`.
  - *Suites:* `src/tests/activity_hu8.test.ts`, `src/tests/track_formats_hu7_hu8.test.ts`.

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
  - *Dominio:* `userManagement.schemas.ts`, `AccountLogEntry` en `types.ts`.
  - *Aplicación:* `ListUsers`, `GetUserDetail`, `BlockUser`, `UnblockUser`, `AssignRole`.
  - *Infraestructura:* `accountLogService.ts`, `isAdmin()` en `firestore.rules`.
  - *Presentación:* `UserManagementView`, `UserCard`, `UserDetailView`, `ConfirmActionModal`.
  - *Suite:* `src/tests/user_management_hu10.test.ts`.

---

## Matriz de Estado Real y Suites

| HU | Módulo | Estado real | Suite Automatizada |
| :--- | :--- | :---: | :--- |
| **HU-01** | Registro | 🟢 95% | `auth_hu1_hu2.test.ts` |
| **HU-02** | Sesión y perfil | 🟢 90% | `auth_hu1_hu2.test.ts` |
| **HU-03** | Explorar y mapa | 🟢 90% | `map_service_hu3.test.ts` (TrekMap nativo OSM/Apple) |
| **HU-04** | Descarga offline | 🟡 55% | `offline_hu4.test.ts` (cálculo de teselas/MB real) |
| **HU-05** | Compartir ruta | 🟢 85% | `share_hu5.test.ts` |
| **HU-06** | Realizar ruta (guía) | 🟡 65% | `activity_hu6.test.ts` |
| **HU-07** | Planificar borrador | 🟢 100% | `plan_hu7.test.ts` (33 pruebas) + `track_formats_hu7_hu8.test.ts` |
| **HU-08** | Grabar GPS y GPX | 🟢 80% | `activity_hu8.test.ts` + `track_formats_hu7_hu8.test.ts` |
| **HU-09** | Moderación | 🚫 — | Eliminada del alcance |
| **HU-10** | Admin y roles | 🟢 90% | `user_management_hu10.test.ts` |

### Comandos Canónicos de Verificación
```bash
npm run lint   # tsc --noEmit — DEBE quedar en 0 errores
npm test       # 9 suites automáticas en serie (>95 casos de prueba en verde)
npx expo-doctor # obligatorio antes de tocar dependencias o permisos nativos
```

## Servicios reutilizables HU-01/02 → HU-03… (para el otro dev, sin avanzar su HU)
- `useAuth()` (`infrastructure/auth/AuthContext.tsx`): `currentUser`, `isGuest`
  (solo memoria, nunca persiste), `isAuthenticated`, `continueAsGuest()`, `exitGuest()`,
  `hasRole([...])`, `isAdmin`, `login/register/logout`.
- Gate (`src/App.tsx`): con sesión → `HomeView`; guest → `ExploreView` genérica
  (`views/explore/`, en blanco, ya distingue invitado/autenticado/rol); resto → `AuthView`.
- Capacidad prevista del guest (pendiente de sus criterios): ver catálogo y detalle.
  Todo lo que escriba (GPS, offline, moderar) exige `isAuthenticated` / `hasRole`.
