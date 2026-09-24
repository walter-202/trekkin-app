# HU-03: Explorar y Consultar Rutas — 🟢 90%

- **Dueño:** desbloqueo mapas 2026-09-17 · **Rama observada:** `codex/hu3-online-preview`
- **Rol:** Visitante / Senderista.
- **Narrativa:** como senderista o visitante quiero explorar el catálogo público
  para evaluar la excursión antes de salir.
- **Figura oficial:** `docs/USER_STORIES.md` § HU-03.
- **Plan de motor:** `docs/plan/plan_mapas_on_offline.md` (v7 MapLibre GL).

## DoD vigente (código y evidencia automatizada)

1. `C1` Catálogo público en `src/presentation/views/explore/ExploreView.tsx`
   (`ListPublishedRoutesUseCase` + fallback `SEED_PUBLISHED_ROUTES`), con cursor
   estable y carga paginada.
2. `C2` Búsqueda texto + chips dificultad con `RouteFiltersSchema`.
3. `C3` `RouteCard`: nombre, tramo, km, horas, badge y foto. **0 mapas en el feed.**
4. `C4` Detalle público para visitantes: header, métricas, itinerario y
   checkpoints. Mostrar el detalle no requiere iniciar sesión.
5. `C5` Mapa online `TrekMap` con MapLibre GL JS/OpenFreeMap. El trazado usa el
   `RoutePreview` compacto y acotado guardado en Firestore; como compatibilidad
   de migración, una ruta legacy sin preview puede usar `waypoints`, acotados
   antes de dibujarse. El detalle no descarga GPX ni PMTiles de Firebase Storage
   y no pasa `offlinePackPath` a `TrekMap`. 0 Google Maps SDK.
6. `C6` Gate: tracking y descarga offline requieren sesión; la descarga solo se
   habilita cuando el par publicado GPX + PMTiles está completo, marcado
   `uploaded`, comparte versión y pasa las validaciones de metadata, MIME y ruta
   canónica de Storage.
7. `C7` Publicación genera/valida el preview versionado y elimina los
   `waypoints` completos del documento público de Firestore.
8. `C8` Cache de detalle en AsyncStorage: conserva metadata y geometría compacta,
   no bytes GPX/PMTiles; se identifica por ruta y versión/hash del preview, tiene
   máximo 30 detalles y sirve el dato guardado mientras refresca desde Firestore.

## Evidencia y brecha

Estado funcional documentado: **90%**. Hay pruebas automatizadas de contrato,
publicación, render-source y cache. Sigue pendiente validar integración Firebase
Emulator, la UI en Expo Go/dispositivo (Android/iOS) y web local, además de la
revisión UI humana. No se afirma prueba en runtime ni cierre al 100%.

## Qué se rechazó (no reabrir)

- `react-native-maps` + `UrlTile` / Carto / `mapType="none"`: en Android el
  renderer **es** Google; sin key = lienzo oscuro + logo. OSM no es un provider
  de ese paquete. OpenFreeMap no es PNG `{z}/{x}/{y}`.
- Placeholder web “Vista Web — Trekkin Bolivia”: era la ausencia de renderer.

## Cómo probar

Ver `docs/plan/plan_mapas_on_offline.md` §4 (web local + Expo Go). Las pruebas
automatizadas actuales para esta HU son:

- Catálogo/preview: `src/tests/catalog_hu3.test.ts`,
  `src/tests/route_preview_hu3.test.ts`.
- Publicación Firestore: `src/tests/route_publication_artifacts.test.ts`,
  `src/tests/firestore_rules_published_preview.test.ts`.
- Detalle online, compatibilidad legacy y gate de descarga: `src/tests/route_detail_online_hu3.test.ts`.
- Cache acotado y stale-while-revalidate: `src/tests/route_detail_cache_hu3.test.ts`.
- Contrato cartográfico: `src/tests/map_service_hu3.test.ts`.

## Refinamiento histórico (2026-09-16, no incorporado)

Se propuso que el visitante viera solo el catálogo y que el detalle exigiera
login, sujeto a confirmación de criterios `C1'`–`C6'`. Esa propuesta histórica
no se incorporó al DoD vigente: `C4` mantiene el detalle público y `C6` protege
las acciones de tracking/descarga, no la consulta.

## Siguiente paso

Completar Firebase Emulator, validación UI en Expo Go/dispositivo y web local,
matriz Android/iOS y revisión UI humana. HU-04 packs en
`docs/plan/offline_maps.md`.
