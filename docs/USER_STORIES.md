# trekkin-app — Historias de Usuario (Figura Oficial del Equipo)

> **Revisión técnica consolidada 2026-09-17 (MapLibre GL — desbloqueo Android/web).**
> Regla de validación vigente: **100% solo con matriz Expo Go + web localhost + `/ui-review` sin blockers + OK del usuario**. Todo lo demás declara su % real.
>
> **Alcance real consolidado (verificación T9 — actualizado 2026-09-24):**
>
> - **🟢 Sólidas:** HU-01 (95%), HU-02 (90%), HU-03 (90%), HU-05 (80%), HU-07 (85%), HU-08 (85%), HU-10 (90%).
> - **🟡 En progreso / pendientes de campo:** HU-04 (80%), HU-06 (75%), HU-09 (70%).
> - **🔴 RF Won't (sin HU):** RF-24, RF-33, RF-34, RF-35, RF-42, RF-43.
> - **Por sprint:** S1 → HU-01/02 · S2 → HU-03/07/08/12/13 · S3 → HU-04/05/06/09/10/11.
> - **Regla T9:** HU-04…HU-08 no pueden superar 90% ni declararse 100% mientras falten Firebase Emulator, Expo Go UI, dispositivos físicos y revisión UI completa.
> - **Roles vigentes:** `user` y `admin` (sin moderador).

---

## 🧭 Guía Técnica para Desarrolladores y Agentes: Qué Usar (Canónico)

Para evitar duplicaciones, componentes obsoletos o reescrituras innecesarias, todos los agentes y desarrolladores **DEBEN** ceñirse a estos estándares técnicos:

### 1. Mapas e Interfaz Visual (V1 MapLibre — Expo Go + web)

- **Componente Único de Mapa:** [`src/presentation/components/map/TrekMap.tsx`](../src/presentation/components/map/TrekMap.tsx) con [`TrekMapProps`](../src/presentation/components/map/TrekMap.types.ts).
  - Motor: **MapLibre GL JS** (estilo OpenFreeMap, datos OSM, 0 API keys de Google).
  - **Web:** GL JS en el DOM (`TrekMap.web.tsx`).
  - **Android / iOS (Expo Go):** el mismo GL JS en `react-native-webview` (`TrekMap.native.tsx`). No es el SDK de Google: no hay logo Google ni key de billing.
  - **V2 (opcional, rebuild):** `@maplibre/maplibre-react-native` + `expo prebuild`. Mismo contrato; ver `docs/plan/plan_mapas_on_offline.md`.
  - **PROHIBIDO:** `react-native-maps`, `PlanMap.tsx`, teselas PNG caseras, Google Maps API. `OfflineRouteMap.tsx` solo puede actuar como fallback neutral de GPX cuando el renderer PMTiles no está disponible; no es un basemap.
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
- **Actividades Largas (>500 puntos):** Los puntos completos se conservan localmente en SQLite/AsyncStorage; no se escriben arrays ni subcolecciones `points` en Firestore. El GPX terminado usa Firebase Storage privado y Firestore solo guarda sus metadatos/estado.
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
  5. ✅ Mapa online con `TrekMap` (MapLibre GL JS): OpenFreeMap, trazado desde el `RoutePreview` compacto y acotado de Firestore, marcadores inicio/fin/checkpoints. Rutas legacy sin preview pueden usar `waypoints` como fallback, acotados antes de pintar. El detalle no solicita GPX/PMTiles a Storage ni entrega `offlinePackPath` al mapa. 0 Google Maps SDK.
  6. ✅ Paginación y control de carga: `routeService.listPublishedRoutesPaginated` para consumo eficiente de Firestore.
  7. ✅ Gate amigable: detalle público para visitantes; descarga/tracking requieren autenticación. La descarga además exige un par GPX + PMTiles publicado y válido (ambos `uploaded`, misma versión, MIME/rutas canónicas).
  8. ✅ Publicación: genera y valida un `RoutePreview` versionado y acotado, escribe solo esa geometría pública y elimina `waypoints` completos del documento Firestore.
  9. ✅ Cache local del detalle: AsyncStorage guarda metadata y preview compacto (nunca bytes de artefactos), con identidad por ruta + versión/hash del preview; capacidad máxima de 30 detalles y refresco desde Firestore tipo stale-while-revalidate.
- **Estado real y brecha (90%):** contratos, catálogo, preview de publicación, detalle online, cache y gates tienen evidencia en suites automatizadas. Siguen pendientes Firebase Emulator, validación UI en Expo Go/dispositivo y web local, matriz de Android/iOS y revisión UI humana; no se declara 100% hasta reunir esa evidencia. Plan: `docs/plan/plan_mapas_on_offline.md`.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/route.schemas.ts`, `routePreview.ts`, `routePreview.schemas.ts`, `routeCatalog.ts`.
  - _Aplicación:_ `ListPublishedRoutes` / `SearchRoutes` / `GetRouteDetail` / `GetRouteDetailWithCache` / `RouteDetailSupport` / `PublishRoute` usecases.
  - _Infraestructura:_ `src/infrastructure/database/routeService.ts` (detalle, preview y publicación), `src/infrastructure/persistence/routeDetailCache.ts` + `RouteDetailCacheRepository` (AsyncStorage), `src/infrastructure/map/mapStyle.ts`.
  - _Presentación:_ `ExploreView.tsx`, `RouteCard.tsx`, `RouteDetailView.tsx`, `TrekMap` (`TrekMap.web.tsx` / `TrekMap.native.tsx`).
  - _Suite:_ `src/tests/catalog_hu3.test.ts`, `route_preview_hu3.test.ts`, `route_publication_artifacts.test.ts`, `route_detail_online_hu3.test.ts`, `route_detail_cache_hu3.test.ts`, `firestore_rules_published_preview.test.ts`, `map_service_hu3.test.ts`.

---

## HU-04: Descargar Ruta Offline — 🟡 80% en progreso

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** senderista sin cobertura **quiero** descargar ruta + mapa base **para** consultarla en campo sin internet.
- **Criterios de Aceptación (DoD):**
  1. ✅ `RouteDetailView` ofrece descarga solo a usuarios autenticados y cuando el par GPX + PMTiles está completo, `uploaded`, versionado en conjunto y cumple los metadatos/rutas canónicas publicados.
  2. ✅ Estimación previa basada en los tamaños publicados de GPX y PMTiles más la metadata básica de ruta.
  3. ✅ `tileCacheDB` descarga los artefactos binarios separados desde Firebase Storage, verifica tamaño/hash y cabecera PMTiles, los promueve atómicamente y persiste un manifiesto v2; Firestore conserva solo metadatos.
  4. ✅ Tras validar la integridad del GPX descargado, la traza local del manifiesto se obtiene parseando ese GPX (geometría exacta); no se deriva del preview ni de los waypoints públicos. PMTiles sigue siendo un artefacto Storage separado para el mapa base.
  5. ⚠️ Modo avión: `TrekMap.offlinePackPath` resuelve el PMTiles local a `pmtiles://` y cambia el estilo; si el renderer no está disponible, el GPX/trail se muestra con fallback neutral. Falta evidencia del renderer PMTiles en frío en dispositivos físicos.
- **Estado real y brecha (80%):** contratos, autenticación/validación del par, descarga binaria, integridad GPX/PMTiles, traza GPX, manifiesto atómico y fallback tienen evidencia en suites automatizadas. Pendientes Firebase Emulator, Expo Go/dispositivo, Storage real y prueba Android/iOS con almacenamiento local en frío y modo avión.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/offline.ts`, `src/core/domain/offline.schemas.ts`, `src/core/domain/routeArtifacts.schemas.ts`, `src/core/domain/mapPackFormats.ts`.
  - _Aplicación:_ `CheckRouteDownloadAvailability` / `DownloadRouteOffline` / `EstimateRouteDownloadSize` / `ResolveOfflinePack` usecases; `ValidateRoutePublicationUseCase` valida el par publicado.
  - _Infraestructura:_ `src/infrastructure/persistence/tileCacheDB.ts`, `src/infrastructure/map/mapStyle.ts` (`buildOfflineVectorStyle`). Destino: `expo-file-system`.
  - _Presentación:_ `DownloadRouteModal.tsx`, `DownloadsView.tsx`, `TrekMap` (`offlinePackPath`).
  - _Suite:_ `src/tests/offline_bundle.test.ts`, `offline_hu4.test.ts`, `storage_rules_route_bundle.test.ts`, `offline_map_fallback.test.ts`, `map_pack_formats.test.ts`, `route_publication_artifacts.test.ts`, `route_detail_online_hu3.test.ts`.

---

## HU-05: Compartir Ruta Publicada — 🟢 80% funcional

- **Rol:** Senderista / Usuario.
- **Narrativa:** **Como** usuario **quiero** compartir una ruta pública por enlace y mensajería **para** difundirla con mi grupo.
- **Criterios de Aceptación (DoD):**
  1. ✅ Botón compartir en `RouteDetailView`.
  2. ✅ `ShareRouteUseCase` exige `status === 'published'`.
  3. ✅ URL canónica `trekkin-app://r/{routeId}` por `routeId` Firestore, sin duplicar colecciones.
  4. ✅ `ShareModal`: resumen + caja enlace + "Copiar enlace" (`expo-clipboard` + feedback) + Share Sheet nativo.
  5. ✅ Deep link en `App.tsx` (`Linking.addEventListener`) abre el detalle.
  6. ⚠️ Exportación de archivo: `ExportTrackFileUseCase` genera el `.gpx`; falta verificar el adjunto en el share sheet nativo.
- **Estado real y brecha (20%):** contrato de enlace, permisos y serialización tienen evidencia en `share_hu5.test.ts`. Pendientes: Firebase Emulator, share sheet nativo en Android/iOS, adjunto GPX real, Expo Go UI y revisión UI completa.
- **Mapeo Técnico:**
  - _Dominio:_ `src/core/domain/share.schemas.ts`, `src/core/domain/trackFormats.ts`.
  - _Aplicación:_ `ShareRoute` / `CopyShareLink` / `PublishShareLink` / `ExportTrackFile` usecases.
  - _Infraestructura:_ `src/infrastructure/share/shareService.ts`.
  - _Presentación:_ `ShareModal.tsx`, `RouteDetailView.tsx`.
  - _Suite:_ `src/tests/share_hu5.test.ts`.

---

## HU-06: Realizar una Ruta Existente — 🟡 75% en progreso

- **Rol:** Senderista registrado.
- **Narrativa:** **Como** senderista en campo **quiero** seguir una ruta con GPS en vivo **para** guiarme por el trazado oficial, chequear checkpoints y guardar mi historial.
- **Criterios de Aceptación (DoD):**
  1. ⚠️ `PrepareView`: muestra ruta + GPS + distancia al inicio.
  2. ✅ `TrackingView`: trazado oficial + track GPS + posición + HUD sobre `<TrekMap />`.
  3. ✅ Checkpoints auto-visitados por proximidad (`isNearM`) + manual.
  4. ✅ Pausa/reanuda/finaliza con `completed`/`incomplete` + autosave local + guardado en Firestore.
  5. ⚠️ Background GPS: task, permisos y persistencia serializada están implementados; falta verificar pantalla bloqueada, app terminada y endurance en dispositivos.
- **Estado real y brecha (25%):** lógica de estados/métricas, persistencia local y task tienen evidencia pura. Pendientes: Firebase Emulator, Expo Go UI, Android/iOS con pantalla apagada/terminada, endurance y revisión UI.
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
- **Estado real y brecha (15%):** persistencia, modelo y motor de importación completos; la suite no usa ni valida caché raster. Falta pulido de botones undo/clear, Firebase Emulator, Expo Go UI y revisión UI completa.
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
  3. ✅ Resumen: distancia, ritmo, velocidad, desnivel; persistencia local y sincronización retryable de metadatos/GPX.
  4. ✅ Exportación GPX 1.1 desde el resumen (`ExportTrackFile` + share/descarga).
  5. ✅ Protección anti-colapso: sin arrays GPS ni `points/{chunkIndex}` en Firestore; GPX en Storage con reglas owner-only y límite de tamaño.
  6. ⚠️ Grabación con pantalla apagada: task y configuración nativa están implementados, pero no hay evidencia de dispositivo para pantalla apagada, app terminada ni endurance.
  7. ✅ Handoff HU-07→HU-08: `ReadyForGpsView` inicia GPS (`StartRecordingFromPlan` + `TrackingView` High).
- **Estado real y brecha (15%):** primer plano, checkpoints, finalización, GPX, SQLite y sincronización local tienen evidencia pura. Pendientes: Firebase Emulator, Expo Go UI, Android/iOS con pantalla apagada/terminada/endurance, share sheet nativo y revisión UI completa.
- **Mapeo Técnico:**
  - _Dominio:_ `activity.schemas.ts`, `calculations.ts`, `src/core/domain/trackFormats.ts` (`toGeoJSON`, `buildGPX11`).
  - _Aplicación:_ `StartRecordingFromPlan`, `AddCheckpoint`, `RecordPoint`, `FinishActivity`, `ExportTrackFile`.
  - _Infraestructura:_ `activityService.ts`, `locationService.ts` (`RECORDING_WATCH_OPTIONS`).
  - _Presentación:_ `RecordView` → `TrackingView` / `ResultView`, `AddCheckpointModal`.
  - _Suites:_ `src/tests/activity_hu8.test.ts`, `src/tests/track_formats_hu7_hu8.test.ts`.

---

## HU-09: Compartir ruta recién grabada — 🟡 70% funcional

- **Rol:** Usuario.
- **Narrativa:** **Como** usuario de la aplicación **quiero** compartir una ruta que acabo de grabar y guardar **para** enviar el enlace de la ruta a otras personas mediante WhatsApp, redes sociales, mensajería u otros medios disponibles en el dispositivo.
- **Criterios de Aceptación (DoD):**
  1. ✅ El usuario finaliza la grabación desde “Grabar Recorrido”; el sistema detiene el GPS y calcula métricas (distancia, duración, dificultad sugerida, puntos registrados).
  2. ✅ El resumen muestra trazado, distancia, duración y estado (`completed` / `incomplete`).
  3. ⚠️ Opción **“Compartir”** en el resumen de ruta recién grabada: hoy el resumen exporta GPX vía share sheet; falta flujo dedicado `ShareRoute` desde `ResultView` con validación de estado publicable.
  4. ✅ `ShareRoute` valida `status === 'published'` antes de generar enlace (rutas no publicables no comparten enlace público).
  5. ✅ Enlace canónico `trekkin-app://r/{routeId}` + `Linking` en `App.tsx`.
  6. ✅ Al abrir enlace sin sesión: `RouteDetailView` + `onRequireAuth` → `AuthView`; tras login se conserva `pendingRouteId`.
  7. ⚠️ Tras registro/login, redirección al detalle de la ruta compartida: parcial — deep link abre detalle; flujo post-registro con ruta pendiente requiere matriz en dispositivo.
  8. ⚠️ Share sheet nativo con enlace (no solo GPX) desde resumen de grabación: pendiente en dispositivo.
  9. ✅ Mensaje de error tipado si la ruta no es compartible (`ShareRoute` / `share.schemas`).
- **Estado real y brecha (30%):** resumen post-grabación, deep link, gate de auth y share de rutas **publicadas** desde detalle están cubiertos (`share_hu5`, `gpx_delivery`). Falta cerrar el botón “Compartir” en `ResultView` con enlace de ruta (RF-36), pulir conservación del enlace tras registro (RF-37) y UAT completa (WhatsApp, usuario no autenticado, ruta no publicable).
- **Mapeo Técnico:**
  - _Dominio:_ `share.schemas.ts`, `activity.schemas.ts`, `calculations.ts` (`suggestRouteDifficulty`).
  - _Aplicación:_ `ShareRoute`, `CopyShareLink`, `FinishActivity`, `ExportTrackFile`.
  - _Infraestructura:_ `shareService.buildShareUrl`, `Linking` en `App.tsx`, `routeService`.
  - _Presentación:_ `ResultView`, `ShareModal`, `RouteDetailView`.
  - _Suites:_ `share_hu5.test.ts`, `gpx_delivery.test.ts` (base); faltan casos HU-09 específicos desde resumen de grabación.

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
- **Estado real y brecha (10%):** RBAC y auditoría siguen cubiertos. La lista usa páginas acotadas de Firestore con cursor y conserva búsqueda/filtros en memoria sobre las páginas recorridas; cada filtro reinicia el recorrido y las páginas sin coincidencias permiten continuar. La evidencia automatizada local no sustituye la prueba en Expo Go: paginación con más de 50 usuarios, cambios de filtro, reintento y fin de lista en dispositivo siguen pendientes. Mantener el 90% hasta completar esa validación de campo y revisión UI.
- **Mapeo Técnico:**
  - _Dominio:_ `userManagement.schemas.ts`, `AccountLogEntry` en `types.ts`.
  - _Aplicación:_ `ListUsers` filtra cada página recibida por su puerto paginado; el cursor es opaco fuera del adaptador. También están `GetUserDetail`, `BlockUser`, `UnblockUser`, `AssignRole`.
  - _Infraestructura:_ `userProfileService.listUsersPage` pagina por ID de documento ascendente para incluir también perfiles legacy sin `createdAt`, solicita un documento adicional para calcular `hasMore` con exactitud y conserva el último documento como cursor. La presentación mantiene el orden global `createdAt` descendente entre páginas, con perfiles sin fecha al final y UID ascendente como desempate. `accountLogService.ts`, `isAdmin()` en `firestore.rules`.
  - _Presentación:_ `UserManagementView`, `UserCard`, `UserDetailView`, `ConfirmActionModal`.
  - _Suite:_ `src/tests/user_management_hu10.test.ts` (incluye recorrido de páginas, terminal, página cruda sin coincidencias, reinicio/UID duplicados, guardia de solicitudes y reintento). Verificación local reportada aparte; prueba Expo Go y revisión UI pendientes.

---

## HU-11: Certificar offline en campo — 🟡 Roadmap (RF-10)

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** senderista sin cobertura **quiero** confirmar que la ruta descargada funciona en modo avión **para** usarla con confianza en expedición.
- **Criterios de Aceptación (DoD):**
  1. Matriz UAT Android/iOS: descarga → modo avión → mapa PMTiles en frío + trazado GPX visible.
  2. Badge/lista offline coherente en `DownloadsView`.
  3. Evidencia documentada en esta sección (capturas + dispositivo/OS).
- **RF asociados:** RF-10, RNF-01.
- **Sprint:** S3.
- **Extiende:** HU-04.
- **Estado:** 🟡 Sprint 3 — cierre principalmente de pruebas de campo.

---

## HU-12: Fotos georreferenciadas en grabación — 🟡 Roadmap (RF-29)

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** explorador en levantamiento **quiero** adjuntar fotos a la ruta o a un punto **para** enriquecer el registro de campo.
- **Criterios de Aceptación (DoD):**
  1. Captura desde cámara o galería durante grabación (`TrackingView` / checkpoint).
  2. Foto ligada a coordenada y persistida localmente (y metadatos en ruta si aplica).
  3. Recuperación tras interrupción (RNF-02).
- **RF asociados:** RF-29.
- **Sprint:** S2.
- **Extiende:** HU-08.
- **Estado:** 🟡 Sprint 2 — sin flujo UI de captura hoy.

---

## HU-13: Filtros avanzados en catálogo — 🟡 Roadmap (RF-06)

- **Rol:** Visitante / usuario autenticado.
- **Narrativa:** **Como** usuario del catálogo **quiero** filtrar por distancia y duración **para** encontrar rutas acordes a mi tiempo y condición física.
- **Criterios de Aceptación (DoD):**
  1. Filtros por rango o chips de distancia (km) y duración (horas/min) en `ExploreView`.
  2. Combinables con búsqueda por texto y dificultad existentes.
  3. Suite `catalog_hu3` o nueva con casos de filtrado.
- **RF asociados:** RF-06 (completar distancia + duración).
- **Sprint:** S2.
- **Extiende:** HU-03.
- **Estado:** 🟡 Sprint 2 — hoy solo texto + dificultad.

---

## Matriz de Estado Real y Suites

| HU        | Módulo               | Estado real | Suite Automatizada                                       |
| :-------- | :------------------- | :---------: | :------------------------------------------------------- |
| **HU-01** | Registro             |   🟢 95%    | `auth_hu1_hu2.test.ts`                                   |
| **HU-02** | Sesión y perfil      |   🟢 90%    | `auth_hu1_hu2.test.ts`                                   |
| **HU-03** | Explorar y mapa      |   🟢 90%    | `catalog_hu3.test.ts`, `route_preview_hu3.test.ts`, `route_publication_artifacts.test.ts`, `route_detail_online_hu3.test.ts`, `route_detail_cache_hu3.test.ts`, `firestore_rules_published_preview.test.ts`, `map_service_hu3.test.ts` |
| **HU-04** | Descarga offline     |   🟡 80%    | `offline_bundle.test.ts`, `offline_hu4.test.ts`, `storage_rules_route_bundle.test.ts`, `offline_map_fallback.test.ts`, `map_pack_formats.test.ts`, `route_publication_artifacts.test.ts`, `route_detail_online_hu3.test.ts` |
| **HU-05** | Compartir ruta       |   🟢 80%    | `share_hu5.test.ts` + `gpx_delivery.test.ts`              |
| **HU-06** | Realizar ruta (guía) |   🟡 75%    | `activity_hu6.test.ts`, `activity_store.test.ts`, `activity_record_sqlite.test.ts` |
| **HU-07** | Planificar borrador  |   🟢 85%    | `plan_hu7.test.ts` + `track_formats_hu7_hu8.test.ts`     |
| **HU-08** | Grabar GPS y GPX     |   🟢 85%    | `activity_hu8.test.ts`, `track_formats_hu7_hu8.test.ts`, `activity_track_db.test.ts`, `activity_gpx_storage.test.ts`, `background_location.test.ts` |
| **HU-09** | Compartir ruta grabada |   🟡 70%    | `share_hu5`, `gpx_delivery` (base); UAT HU-09 pendiente  |
| **HU-10** | Admin y roles        |   🟢 90%    | `user_management_hu10.test.ts`                           |
| **HU-11** | Offline certificado  |   🟡 S3     | UAT campo (extiende HU-04)                              |
| **HU-12** | Fotos en grabación   |   🟡 S2     | Por crear (RF-29)                                        |
| **HU-13** | Filtros catálogo     |   🟡 S2     | Por crear (RF-06)                                        |

### Matriz T9: evidencia y límites explícitos

`npm test` (suite mayormente pura, con un smoke existente de conectividad Firestore), `npm run lint`, `npx expo-doctor` y `git diff --check` son evidencia local; no equivalen a una prueba de campo ni al Firebase Emulator. La ejecución T9 no debe declarar 100% porque todavía faltan:

- Firebase Emulator para reglas, Storage y sincronización real.
- Expo Go UI y revisión `/ui-review` completa sin blockers.
- Android/iOS físico: Storage local, renderer PMTiles en frío y modo avión.
- Background con pantalla apagada, app terminada y endurance.
- Share Sheet nativo y adjunto GPX real.

No se usa Firestore para chunks de puntos, no se descarga PNG/raster tile a tile y el único bundle offline es GPX + PMTiles con manifiesto binario atómico. La ruta canónica de mapa es `TrekMap`; el legado `PlanMap`/`tileCache` raster fue retirado.

### Comandos Canónicos de Verificación

```bash
npm run lint   # tsc --noEmit — DEBE quedar en 0 errores
npm test       # suites puras HU-01…HU-08 + persistencia/background
npx expo-doctor # obligatorio antes de tocar dependencias o permisos nativos
```
