# trekkin-app — Backlog Técnico Priorizado (Actualizado 2026-09-22, T9)

> Trazabilidad: cada tarea cuelga de una HU de `USER_STORIES.md`.
> Convención: `BK-###` + HU + prioridad P0 (bloqueante) → P3 (pulido).
> Estado: ✅ **HECHO** · 🟡 **EN CURSO** · ⏳ **PENDIENTE** · 🔄 **V2 NATIVO**.

---

## 📊 Resumen Ejecutivo del Backlog

- **Tareas Completadas (T9):** `BK-002`, `BK-003`, `BK-004`, `BK-010`, `BK-011`, `BK-013`, `BK-020`, `BK-021`, `BK-022`, `BK-030`, `BK-031`, `BK-033`, `BK-040`, `BK-043`, `BK-044`.
- **Foco Próximo Inmediato:**
  1. Matriz física HU-03…HU-08: Expo Go Android/iOS + web localhost + modo avión.
  2. Firebase Emulator: reglas, Storage y sincronización real.
  3. `BK-041` (HU-07): Botones de edición fina en planificación (undo, clear, drag).
  4. `BK-051` / `BK-052`: revisión UI completa, share sheet nativo y endurance background.

---

## F0 — Base mapa (desbloquea HU-03/04/06/07/08)

| ID | HU | Tarea | Qué cambia | Estado | Pri / Esf |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **BK-001** | HU-03 | MapLibre Native (dev-build) | V2 opcional: plugin `@maplibre/maplibre-react-native` + `expo prebuild`. No hace falta para pintar el detalle. | 🔄 **V2** | P2 · 1d |
| **BK-002** | HU-03 | Motor libre MapLibre GL | OpenFreeMap (vector OSM, 0 keys). Web DOM + WebView Expo Go. Se retira `react-native-maps`. | ✅ **HECHO** | P0 · 1d |
| **BK-003** | HU-03 | `TrekMap` unificado | `TrekMap.web.tsx` / `TrekMap.native.tsx`, polyline, markers, bounds, `onPress`. | ✅ **HECHO** | P0 · 2d |
| **BK-004** | HU-03 | Catálogo liviano | `RouteCard` con foto; 0 mapas en el feed. Vistas de plan/activity/downloads migradas a `TrekMap`. | ✅ **HECHO** | P0 · 0.5d |

---

## F1 — HU-04 Offline real (mapa base y datos)

| ID | HU | Tarea | Qué cambia | Estado | Pri / Esf |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **BK-010** | HU-04 | Casos `CreatePack/DeletePack` | Detectar PMTiles/MBTiles (`mapPackFormats`), descargar el par binario y persistirlo con manifiesto v2 en `TrekMap`. | ✅ **HECHO** | P0 · 2d |
| **BK-011** | HU-04 | Estimación matemática real | `geoBounds.ts`: `estimateTileCount` + `estimateDownloadSizeMB` por bounding box y zooms 12–15. | ✅ **HECHO** | P0 · 0.5d |
| **BK-012** | HU-04 | `packSpec` en Firestore | Metadata de versión, bounds, zooms y tamaño en bytes; badge "desactualizada". | 🟡 **EN CURSO** | P0 · 1d |
| **BK-013** | HU-04 | Modo avión en mapa | `TrekMap.offlinePackPath` lee `.pmtiles` (`pmtiles://`); `.mbtiles` se rechaza en V1 y el fallback muestra GPX/trail. El archivo local ya se persiste. | ✅ **HECHO** | P1 · 1d |
| **BK-014** | HU-04 | Progreso/cuota/cancel | Listeners de descarga, porcentaje de avance en modal y control de almacenamiento. | ⏳ **PENDIENTE** | P1 · 1d |

---

## F2 — Capa usuario: formatos GPS (HU-07/08/06)

| ID | HU | Tarea | Qué cambia | Estado | Pri / Esf |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **BK-020** | HU-07/08 | `trackFormats.ts` dominio puro | Parsers y serializadores GPX 1.1 (`buildGPX11`), `toGeoJSON`, KML, CSV, altimetría y Ramer-Douglas-Peucker. | ✅ **HECHO** | P0 · 3d |
| **BK-021** | HU-07 | `ImportTrackFile` usecase | Importación de archivos GPX/KML/CSV para precargar en el planificador o unirse a una salida. | ✅ **HECHO** | P1 · 1.5d |
| **BK-022** | HU-08 | `ExportTrackFile` usecase | Generación de archivo GPX estándar compatible con Garmin, Wikiloc y Strava. | ✅ **HECHO** | P1 · 1d |
| **BK-023** | HU-06 | Tracking sobre `TrekMap` | `TrackingView` / prepare / resultado usan `TrekMap`. Pendiente alerta off-route >50m. | 🟡 **EN CURSO** | P1 · 2d |

---

## F3 — Firestore y consolidación (transversal)

| ID | HU | Tarea | Qué cambia | Estado | Pri / Esf |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **BK-030** | HU-03/06 | Partir docs gigantes | Catálogo con cursor pagination `limit(20)`; puntos GPS largos permanecen locales y el GPX terminado va a Storage. | ✅ **HECHO** | P0 · 2d |
| **BK-031** | Todas | Alinear tipos↔reglas↔DATABASE.md | `coverImageUrl`, metadatos GPX/PMTiles y reglas owner-only sincronizados; no hay arrays ni subcolección `points` en Firestore. | ✅ **HECHO** | P0 · 1d |
| **BK-032** | HU-06 | Reintento `unsynced` real | Cola con backoff exponencial para sincronización automática de actividades al recuperar red. | ⏳ **PENDIENTE** | P1 · 1d |
| **BK-033** | HU-08 | GPS fondo + precisión | Descarte `accuracy > 25 m` en `RecordPoint` y task Expo Location/Task Manager serializado. Falta evidencia en dispositivo de pantalla apagada/terminada/endurance. | ✅ **HECHO** | P1 · 2d |

---

## F4 — Cierre por HU

| ID | HU | Tarea | Qué cambia | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **BK-040** | HU-03 | Migrar `Detail` a `TrekMap` | `RouteDetailView` + plan/activity/downloads en MapLibre GL. | ✅ **HECHO** |
| **BK-041** | HU-07 | Undo/clear/drag en editor | Controles de edición geométrica fina en `CreateRouteView` / `PlanEditorView`. | ⏳ **PENDIENTE** |
| **BK-042** | HU-02/10 | Password/theme & paginación | Cambio de contraseña en perfil y paginación cursor en lista admin. | ⏳ **PENDIENTE** |
| **BK-043** | Suites | Suites automáticas completas | Suites puras HU-01…HU-08, persistencia y background (`npm test`); no son evidencia de dispositivo ni Firebase Emulator. | ✅ **HECHO** |
| **BK-044** | Docs | Actualización de documentación | Sincronización de `USER_STORIES.md`, `INFORME_PRESENTACION_CLIENTE.md`, `DATABASE.md` y guía canónica. | ✅ **HECHO** |

---

## F5 — Validación y Gates de Calidad

| ID | HU | Tarea | Qué cambia | Estado | Pri / Esf |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **BK-050** | Todas | Gate pre-codificación | Declarar HU, criterios y dueño antes de codificar. | ✅ **ACTIVO** | P0 · 0.5d |
| **BK-051** | Todas | Matriz de validación en dispositivo | Expo Go + modo avión en dispositivos físicos de prueba. | 🟡 **EN CURSO** | P0 · 1d |
| **BK-052** | Todas | Reviews obligatorias | `/ui-review` sin blockers + revisión de diff por pares. | 🟡 **EN CURSO** | P0 · 0.5d |
| **BK-053** | Todas | Preguntas de cierre por HU | Validación de correcciones y confirmación física antes de marcar 100%. | ✅ **ACTIVO** | P1 · 0.5d |

---

## 🎯 Próximo Orden Sugerido para los Agentes y Devs

```
1. Matriz física HU-03…HU-08 (web localhost + Expo Go Android/iOS + modo avión)
2. Firebase Emulator y Storage real para reglas/sincronización
3. BK-041 (HU-07: Undo/clear en pantalla de planificación)
4. BK-051 / BK-052 (UI review, share sheet y endurance background)
```
