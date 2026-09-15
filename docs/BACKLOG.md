# trekkin-app — Backlog Técnico Priorizado (2026-09-15)

> Trazabilidad: cada tarea cuelga de una HU de `USER_STORIES.md`. Nada fuera de criterio se implementa sin pregunta previa.
> Convención: `BK-###` + HU + prioridad P0 (bloqueante) → P3 (pulido). Esfuerzo en días dev.

## F0 — Base mapa vectorial (desbloquea HU-03/04/06/07/08)

| ID | HU | Tarea | Qué cambia | DoD | Pri / Esf / Dep |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BK-001 | HU-03 | Instalar MapLibre + dev-build | `npx expo install @maplibre/maplibre-react-native`, plugin en `app.json`, `npx expo-doctor`, `npx expo run:android`. Declarar rebuild (no OTA) | Corre en dev-build Android; Expo Go queda solo fallback | P0 · 1d · — |
| BK-002 | HU-03 | `mapStyle.ts` centralizado | Nuevo `src/infrastructure/map/mapStyle.ts`: `STYLE_URL=https://tiles.openfreemap.org/styles/liberty` configurable, sin hardcode; evaluar estilo outdoor con curvas/hillshade (OpenFreeMap base no trae curvas) | Style conmutable sin release; atribución `© OpenMapTiles © OSM` visible | P0 · 0.5d · BK-001 |
| BK-003 | HU-03 | `TrekMap.tsx` vectorial | Nuevo `presentation/components/map/TrekMap.tsx` (MapLibre `Map` + `ShapeSource` GeoJSON + capas línea/marcadores); `PlanMap` queda fallback dev | Zoom 14–16 nítido, 0×403 en matriz 4G/Wifi | P0 · 2d · BK-001/002 |
| BK-004 | HU-03 | Retirar lastre raster | Borrar `react-native-maps` **o** `PlanMap` custom (no ambos), `assets/tflat/` (85 PNGs ~1 MB), `tileCache.ts` base64-AsyncStorage | `npm run lint` 0 errores; APK sin deps muertas | P0 · 0.5d · BK-003 |

## F1 — HU-04 Offline real (mapa base, no JSONs)

| ID | HU | Tarea | Qué cambia | DoD | Pri / Esf / Dep |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BK-010 | HU-04 | Casos `CreatePack/DeletePack/InvalidatePack` | Puertos en `core/application/offline/` → `infrastructure/map/offlinePacks.ts` sobre `OfflineManager.createPack({mapStyle,bounds:[w,s,e,n],minZoom,maxZoom,metadata:{routeId}})` + `getPacks/getPack/deletePack/invalidatePack` | Crear/listar/borrar/invalidar pack por `routeId`, errores propagados | P0 · 2d · BK-001 |
| BK-011 | HU-04 | Estimación vectorial real | Reemplazar `JSON.stringify().length` + `4096+area*5120` por bbox×zooms 12–16 × ~30 KB; mostrar MB + confirmación | Estimación ±30% del pack real medido | P0 · 0.5d · BK-010 |
| BK-012 | HU-04 | `packSpec` en Firestore | `routes/{id}.packSpec{bounds,minZoom,maxZoom,styleVersion,packId,sizeBytes,updatedAt}`; badge "desactualizada" si `route.updatedAt > pack.downloadedAt` | Versionado funcional | P0 · 1d · BK-010 |
| BK-013 | HU-04 | Modo avión real | `NetworkManager.setConnected(false)` + pack = mapa+ruta; sin pack = vacío explícito (nunca gris infinito); retirar `OfflineRouteMap` SVG como "mapa" | Matriz avión en dev-build | P1 · 1d · BK-010 |
| BK-014 | HU-04 | Progreso/cuota/cancel | Listeners progress/error → % bytes, cancelar, límite disco, purge | Sin `QuotaExceeded` silencioso | P1 · 1d · BK-010 |

## F2 — Capa usuario: formatos GPS (HU-07/08/06)

| ID | HU | Tarea | Qué cambia | DoD | Pri / Esf / Dep |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BK-020 | HU-07/08 | `trackFormats.ts` dominio puro | `buildGPX11/parseGPX` (canónico), `toGeoJSON/simplify` (Douglas-Peucker), `parseKML` (+`jszip` KMZ), `parseCSV`, `parsePLT`, `parseTCX` import-only, FIT import-only opcional. Solo `fast-xml-parser`+`jszip` | Round-trip GPX↔GeoJSON sin pérdida; Zod valida | P0 · 3d · — |
| BK-021 | HU-07 | `ImportTrackFile` | `expo-document-picker` → valida → preview en `TrekMap` → `SaveDraft` | GPX/KML/KMZ/CSV/PLT abren borrador | P1 · 1.5d · BK-020 |
| BK-022 | HU-08 | `ExportTrackFile` | `actividad.gpx` + Share/`expo-sharing`; adjuntar en HU-05 | GPX abre en Garmin/Wikiloc | P1 · 1d · BK-020 |
| BK-023 | HU-06 | Tracking sobre vector | Follow-me, snap `projectOnPolyline` (hoy existe pero sin uso en vivo), off-route >50 m, radios configurables, círculo accuracy | Guía usable en campo | P1 · 2d · BK-003 |

## F3 — Firestore y consolidación (transversal)

| ID | HU | Tarea | Qué cambia | DoD | Pri / Esf / Dep |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BK-030 | HU-03/06 | Partir docs gigantes | Catálogo con proyección + `limit(20)` + cursor; track completo solo en detalle; `activities` en chunks `points/{n}` + subida incremental | Ningún doc >500 KB; lista <1 s | P0 · 2d · — |
| BK-031 | Todas | Alinear tipos↔reglas↔DATABASE.md | `elevationGainM/isOfflineCached/bio/...` en los 3 lados; arreglar `allow list` por query (hoy `resource.data` en list = null); `persistentLocalCache` | Reglas despliegan sin warn | P0 · 1d · — |
| BK-032 | HU-06 | Reintento `unsynced` real | Cola con backoff + job al abrir Historial (hoy mezcla pero nunca re-sube) | 0 actividades `isSynced:false` eternas | P1 · 1d · BK-030 |
| BK-033 | HU-08 | GPS fondo + precisión | `Accuracy.High`, descarte `accuracy>25 m`, filtro altimetría, `expo-task-manager` + `ACCESS_BACKGROUND_LOCATION` (rebuild) | Track sobrevive bloqueo | P1 · 2d · BK-001 |

## F4 — Cierre por HU

| ID | HU | Tarea | DoD |
| :--- | :--- | :--- | :--- |
| BK-040 | HU-03 | Migrar `Explore/Detail` a `TrekMap`, enlazar catálogo→`PrepareView` (quitar badge PROVISIONAL) | Fin "primera ruta" hardcodeada |
| BK-041 | HU-07 | Undo/clear/drag puntos + accuracy visible en confirmación GPS | Edición geométrica mínima |
| BK-042 | HU-02/10 | Cerrar password/theme en `ProfileView`; paginación lista admin | HU-02→95%, HU-10→95% |
| BK-043 | Suites | Parsers con `.gpx/.kml/.tcx/.csv/.kmz/.plt` reales + pack create/invalidate + avión | `npm test` verde |
| BK-044 | Docs | Actualizar `USER_STORIES.md` % + evidencias `TrekMap/OfflineManager/GPX` en el mismo commit | Sin % inflados |

## F5 — Validación real y preguntas obligatorias a devs (transversal, sin esto no hay 100%)

> Lo que faltó hasta ahora: agentes y harness codificaban sin preguntar. Estas tareas son gates, no opcionales.

| ID | HU | Tarea | Qué cambia | DoD | Pri / Esf / Dep |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BK-050 | Todas | Gate pre-codificación con `question` | Antes de tocar código de cualquier HU el agente DEBE preguntar (tool `question`): 1) HU + dueño + rama (`git branch --show-current`), 2) criterios pegados si la sección está en scaffold/desactualizada, 3) alcance exacto (ni un campo/botón de más). Sin respuestas no hay Fase 1 | Ningún diff sin HU declarada en voz alta ("Estamos en HU-0X, dueño Y") | P0 · 0.5d · — |
| BK-051 | Todas | Matriz de validación real en dispositivo | Por cada HU tocada: Expo Go (flujo tocado) + dev-build limpio (`npx expo run:android` o EAS) + modo avión donde aplique (HU-04/06). Registrar modelo SO, red (4G/Wifi), resultado. `npm run lint` 0 errores + `npm test` verde vía docker (`docker compose run --rm dev …`) | Tabla de matriz firmada por dev en el PR/commit | P0 · 1d · fin de cada HU |
| BK-052 | Todas | Reviews sí o sí antes de cerrar | `/ui-review` sin blockers + revisión humana del diff por un dev + OK explícito del usuario. Con correcciones → se vuelve a Fase 2 (`/hu-checklist`). 100% solo con las tres | Ningún "100%" sin las tres evidencias en `USER_STORIES.md` | P0 · 0.5d · BK-051 |
| BK-053 | Todas | Preguntas de cierre por HU | Al cerrar: el agente pregunta 1) ¿validaste en dispositivo físico?, 2) ¿qué correcciones salieron?, 3) ¿quién revisó el diff? Respuestas quedan en el commit/PR | Cierre bloqueado sin respuestas | P1 · 0.5d · BK-052 |
| BK-054 | HU-03/04/06/07/08 | Preguntas de mapa/offline a devs | ¿Zona real de prueba (no solo La Paz z9–12)?, ¿zooms 14–16 verificados?, ¿pack invalidado tras `updatedAt`?, ¿GPX de prueba aportado por el equipo? | Cada HU de mapa trae sus archivos/zonas de prueba adjuntos | P1 · 0.5d · BK-010/020 |

## Orden sugerido

`BK-001→004 (F0) → BK-010→012 + BK-020 (F1/F2 en paralelo) → BK-030/031 → BK-023/033 → BK-040→044` + `BK-050→054` como gates permanentes en cada HU.
