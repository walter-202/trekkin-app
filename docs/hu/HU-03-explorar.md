# HU-03: Explorar y Consultar Rutas — 🟢 90%

- **Dueño:** desbloqueo mapas 2026-09-17 · **Rama:** `main`
- **Rol:** Visitante / Senderista.
- **Narrativa:** como senderista o visitante quiero explorar el catálogo público
  para evaluar la excursión antes de salir.
- **Figura oficial:** `docs/USER_STORIES.md` § HU-03.
- **Plan de motor:** `docs/plan/plan_mapas_on_offline.md` (v7 MapLibre GL).

## DoD vigente (código real)

1. `C1` Catálogo público en `src/presentation/views/explore/ExploreView.tsx`
   (`ListPublishedRoutesUseCase` + fallback `SEED_PUBLISHED_ROUTES`).
2. `C2` Búsqueda texto + chips dificultad con `RouteFiltersSchema`.
3. `C3` `RouteCard`: nombre, tramo, km, horas, badge, foto. **0 mapas en el feed.**
4. `C4` Detalle público: header, métricas, itinerario, checkpoints.
5. `C5` Mapa `TrekMap` MapLibre GL JS (OpenFreeMap). Web = DOM; nativo Expo Go =
   WebView. **No se descarga pack** para consultar el detalle. 0 Google Maps SDK.
6. `C6` Gate: GPS/offline piden sesión; el detalle no.

## Qué se rechazó (no reabrir)

- `react-native-maps` + `UrlTile` / Carto / `mapType="none"`: en Android el
  renderer **es** Google; sin key = lienzo oscuro + logo. OSM no es un provider
  de ese paquete. OpenFreeMap no es PNG `{z}/{x}/{y}`.
- Placeholder web “Vista Web — Trekkin Bolivia”: era la ausencia de renderer.

## Cómo probar

Ver `docs/plan/plan_mapas_on_offline.md` §4 (web localhost + Expo Go).

## Refinamiento propuesto 2026-09-16 (no aplicado)

Visitante = solo catálogo; detalle exige login. Sigue en espera de confirmación
de criterios `C1'`–`C6'`.

## Siguiente paso

Matriz física del mapa MapLibre (Android Expo Go + web). HU-04 packs en
`docs/plan/offline_maps.md`.
