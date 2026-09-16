# HU-03: Explorar y Consultar Rutas — 🟢 90%

- **Dueño:** sesión 2026-09-16 (dev HU-03) · **Rama:** `main`
- **Rol:** Visitante / Senderista.
- **Narrativa:** como senderista o visitante quiero explorar el catálogo público
  para evaluar la excursión antes de salir.
- **Figura oficial:** `docs/USER_STORIES.md` § HU-03.

## DoD vigente (código real verificado)

1. `C1` Catálogo público en `src/presentation/views/explore/ExploreView.tsx:57-81`
   (`ListPublishedRoutesUseCase` + fallback `SEED_PUBLISHED_ROUTES`).
2. `C2` Búsqueda texto + chips dificultad con `RouteFiltersSchema`
   (`ExploreView.tsx:83-108,163-182`).
3. `C3` `RouteCard` (`src/presentation/views/explore/RouteCard.tsx:18-72`):
   nombre, tramo inicio→fin, km, horas, badge dificultad, `photos[0]` con fallback.
4. `C4` Detalle hoy público (`ExploreView.tsx:116-124` → `RouteDetailView`
   sin chequear sesión): header, `TrekMap` nativo, métricas, itinerario,
   checkpoints (`src/presentation/views/explore/RouteDetailView.tsx:139-165`).
5. `C5` Mapa ✅ nativo: `TrekMap.tsx` (Apple Maps iOS / OSM Android con
   `mapType="none"` para apagar la base Google — fix 2026-09-16: antes el
   `<UrlTile>` OSM quedaba tapado por Google y OSM 403eaba sin `User-Agent`;
   fix-2: tiles Carto Voyager por defecto + se quitó el loader fullscreen que
   tapaba el trazado + atribución © OSM · © CARTO).
   fix-3 (web): `TrekMap` ya no importa `react-native-maps` estático — sus specs
   (`codegenNativeComponent`) reventaban `npm run web` al arrancar; ahora solo
   `import type` + `require` diferido en nativo, en web el módulo ni se ejecuta.

- **Verificado 2026-09-16:** template Carto responde `200 image/png 18KB`
  (la URL está sana); `expo-doctor` 19/21 — falla solo por doble lockfile
  (`pnpm-lock.yaml` + `package-lock.json`, EAS infiere el package manager de ahí)
  y drift patch `expo/expo-location` (nada de mapas). `react-native-maps@1.27.2`
  aceptado para SDK 57.
- **Firestore vacío:** el detalle muestra seed (`ruta-illimani-base` idéntico al
  local) + consola `permission-denied` en `get routes/...` como invitado = doc
  inexistente (`resource.data` null niega). No es bug de reglas: falta correr
  `npm run seed:routes`.
- **Límite estructural:** con `react-native-maps` en Android el logo Google es
  inamovible (atribución obligatoria del SDK aunque `mapType="none"` apague sus
  calles). Sin-Google total solo con MapLibre dev-build (V2, adiós Expo Go).
  Suite `src/tests/map_service_hu3.test.ts` 5/5. Brecha: verificar fondo +
  trazado + pins en Android físico y matriz multi-dispositivo. Nota: el logo
  Google persiste (renderer Android ES el SDK de Google; solo sale con
  MapLibre dev-build V2).

6. `C6` Gate amigable parcial (`src/App.tsx:57-106`, `RouteDetailView.tsx:265-281`):
   invitado entra al detalle, solo GPS/offline piden sesión.

## Refinamiento acordado 2026-09-16 (PROPUESTO, no aplicado en código)

> Visitante = solo Inicio (`ExploreView` catálogo). Detalle exige login, incluso por deep link.

- `C1'` Sin sesión solo catálogo (lista + búsqueda + filtros). Sin salida salvo `AuthView`.
- `C2'` Tap en card en visitante → `AuthView` cancelable, no `RouteDetailView`.
  Al cancelar vuelve al catálogo con texto/filtro intactos.
- `C3'` `RouteDetailView` (métricas, checkpoints, mapa, Compartir HU-05 /
  Descargar HU-04 / GPS HU-06) solo si `isAuthenticated`.
- `C4'` Deep link `trekkin-app://r/{id}` (`src/App.tsx:43-55,153-164`)
  con `pendingRouteId` también pide login primero.
- `C5'` Mapa sin cambio (sigue ❌ pendiente).
- `C6'` Estados loading/vacío/error + banner demo se mantienen.

## Archivos a tocar cuando se aplique

- `ExploreView.tsx:116-124,199-214` — nueva prop `onRequireAuth`, guarda en tap.
- `src/App.tsx:100-106,153-164,190-192` — retomar detalle tras login,
  misma guarda para deep link.
- `RouteDetailView.tsx:264-281` — `guestBox` como defensa o se elimina.
- `firestore.rules` — verificar lectura pública de `routes` publicadas (el catálogo la necesita).
- Docs: reescribir § HU-03 en `USER_STORIES.md` en el mismo commit del cambio.

## Riesgos

- HU-05 pierde vista previa pública por link. HU-04/06 sin cambio (ya exigían sesión).

## Siguiente paso

- Confirmar DoD `C1'`–`C6'` y aplicar código + validación Expo Go
  (visitante→login→cancela→catálogo; login→detalle; link sin sesión→login→detalle).

## Handoff — mapa Android pendiente (2026-09-16, para quien lo tome)

**Síntoma:** Android físico (Expo Go + Metro) muestra Google (logo abajo-izq) y
OSM solo como nota "© OpenStreetMap · © CARTO". iPhone perfecto (Apple Maps).
Web OK (crash `codegenNativeComponent` arreglado, fallback vive).

**Código entregado:** `TrekMap.tsx` con `mapType="none"` en Android + `<UrlTile>`
Carto Voyager + sin loader fullscreen + atribución + `require` diferido en web;
prop nueva `tileUrlTemplate`. `lint` 0 errores, suite `map_service_hu3` 5/5.

**Verificado, no reinvestigar:**

1. El bundle nuevo SÍ corre en el celu (la atribución se ve).
2. `mapType="none"` SÍ llegó antes (las calles Google desaparecieron → fondo oscuro).
3. El template Carto responde `200 image/png 18KB` (curl 2026-09-16).
4. `expo-doctor` 19/21: solo doble lockfile + drift patch `expo/location`; nada de mapas.
5. Seed trae waypoints (4/3/3), `theme.ts` colores sanos, un solo `MapView` en la app.
6. Firestore `routes` VACÍO → todo corre con seed; el `permission-denied` en consola
   como invitado es doc inexistente, no bug de reglas. `npm run seed:routes`
   pendiente — lo hace el dueño HU-03 luego, NO correr sin avisarle.

**Resolución aplicada (2026-09-16):**
- Causa raíz confirmada: en el SDK nativo de Google Maps para Android, `zIndex={-1}` dibuja el `TileOverlay` por debajo de la superficie base (ground surface), de modo que el lienzo oscuro de `mapType="none"` lo tapa o lo descarta.
- Corrección en `TrekMap.tsx`: se cambió `zIndex={-1}` a `zIndex={1}` (por encima del lienzo base, por debajo de Polyline zIndex=10 y Marker zIndex=20) y se agregó `shouldReplaceMapContent={true}` (prop específica de Android para reemplazar la capa base).

**Repro / Verificación:** `npx expo start --lan` → Expo Go Android → Explorar → cualquier ruta → detalle; las calles de Carto Voyager y el trazado se renderizan correctamente sobre el fondo.
