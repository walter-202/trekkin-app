# HU-03: Explorar y Consultar Rutas — 🟡 70%

- **Dueño:** sesión 2026-09-16 (dev HU-03) · **Rama:** `main`
- **Rol:** Visitante / Senderista.
- **Narrativa:** como senderista o visitante quiero explorar el catálogo público
  para evaluar la excursión antes de salir.
- **Figura oficial:** `docs/USER_STORIES.md` § HU-03 (no se modifica en este commit).

## DoD vigente (código real verificado)

1. `C1` Catálogo público en `src/presentation/views/explore/ExploreView.tsx:57-81`
   (`ListPublishedRoutesUseCase` + fallback `SEED_PUBLISHED_ROUTES`).
2. `C2` Búsqueda texto + chips dificultad con `RouteFiltersSchema`
   (`ExploreView.tsx:83-108,163-182`).
3. `C3` `RouteCard` (`src/presentation/views/explore/RouteCard.tsx:18-72`):
   nombre, tramo inicio→fin, km, horas, badge dificultad, `photos[0]` con fallback.
4. `C4` Detalle hoy público (`ExploreView.tsx:116-124` → `RouteDetailView`
   sin chequear sesión): header, `PlanMap`, métricas, itinerario, checkpoints
   (`src/presentation/views/explore/RouteDetailView.tsx:132-262`).
5. `C5` Mapa ❌ no producción: `PlanMap` raster OSM → 403 en celular, gris fuera
   de La Paz z9–12. Destino: `TrekMap` MapLibre + OpenFreeMap + GeoJSON.
6. `C6` Gate amigable parcial (`src/App.tsx:57-106`, `RouteDetailView.tsx:265-281`):
   invitado entra al detalle, solo GPS/offline piden sesión.
- **Sin suite HU-03** (7 suites en `src/tests/`, ninguna de explorar).

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
