# Packs offline (PMTiles / MBTiles) — anexo de `plan_mapas_on_offline.md` v8

> El renderer canónico y cómo probar V1/V2 están en `plan_mapas_on_offline.md`.
> Este archivo solo cubre **la capa de fondo** para HU-04/06/08.

## La pregunta

¿Mapa base en modo avión sin miles de PNG y sin Google? **Sí**, con **un archivo PMTiles** por ruta más el GPX de usuario.

```
❌ Tile a tile (PNG en /offline_packs/{id}/{z}/{x}/{y}.png)
   = incompleto → gris; viola política OSMF si se baja de tile.openstreetmap.org
   = no es lo que pinta MapLibre con estilo vectorial

✅ Un pack: PMTiles o MBTiles
   = ríos, montañas, senderos, etiquetas dentro de UN archivo
   = MapLibre lee el archivo local; la polyline GPX va encima (capa usuario)
```

## Formatos

| Formato | Qué es | V1 (GL JS / WebView) | V2 (MapLibre Native) |
|---|---|---|---|
| **PMTiles** | Un archivo, range requests, sin SQLite en JS | ✅ protocolo `pmtiles://` + `pmtiles` JS | ✅ `pmtiles://` + archivo local |
| **MBTiles** | SQLite de teselas | ⚠️ hace falta sql.js (pesado) o convertir a PMTiles | ✅ `mbtiles://` nativo |
| PNG `{z}/{x}/{y}` | Árbol de imágenes | No usar | No usar |
| `OfflineManager.createPack` | Caché interna MapLibre Native | ❌ | ✅ bbox + style URL |

**Canónico Trekkin:** publicar y descargar **PMTiles** (sirve web + Expo Go + nativo). Si llega un `.mbtiles`, convertir:

```bash
pmtiles convert ruta.mbtiles ruta.pmtiles
# o extraer un bbox del planeta Protomaps:
pmtiles extract https://build.protomaps.com/LATEST.pmtiles cordillera.pmtiles \
  --bbox=-68.5,-17.0,-67.5,-15.8 --minzoom=12 --maxzoom=16
```

HU-03 **no** descarga pack: usa `ONLINE_STYLE_URL` (OpenFreeMap).

## Contrato de artefactos publicados (T6)

Una ruta publicada referencia dos objetos binarios en Firebase Storage; Firestore
solo guarda sus metadatos. GPX y PMTiles deben compartir una versión positiva y
estar cargados antes de cambiar `routes/{routeId}.status` a `published`:

```text
routes/{routeId}/v{version}/route.gpx
routes/{routeId}/v{version}/basemap.pmtiles
```

Cada entrada contiene `kind`, `version`, `storagePath`, `fileName`, `mimeType`,
`byteSize`, `sha256`, `status` (`pending` | `uploading` | `uploaded` | `failed`)
y `updatedAt`. El MIME canónico es `application/gpx+xml` para GPX y
`application/vnd.pmtiles` para PMTiles. Los bytes no se guardan en Firestore y
no se permiten arreglos/chunks de puntos como artefactos. PMTiles es el formato
canónico de V1. T7 implementa la descarga binaria GPX + PMTiles, validación de
tamaño/hash/magic bytes, reemplazo por generación y manifiesto v2; Firestore
solo conserva metadatos.

## Por qué no WebView “solo para offline” como plan aparte

V1 **ya** usa MapLibre GL JS (web + WebView) para pintar. El pack HU-04 se enchufa al **mismo** documento (`loadOfflinePack` / source `pmtiles://`). No hay un segundo motor.

V2 (dev-build) puede sustituir el WebView por MapLibre Native y usar `OfflineManager.createPack` o sideload MBTiles. Mismo `TrekMapProps`.

## Expo Go vs nativo (recordatorio)

| | Expo Go + web (V1) | Dev client (V2) |
|---|---|---|
| Pintar detalle HU-03 | MapLibre GL JS | MapLibre Native |
| Pack HU-04 | PMTiles en disco + GL JS | OfflineManager y/o MBTiles/PMTiles |
| Rebuild | No | `expo prebuild` / `expo run:*` / EAS |

## Estimación de tamaño

`geoBounds.estimateTileCount` cuenta teselas slippy. Para vector, usar `averageTileBytes ≈ 30 KiB` (ya documentado en `estimateDownloadSizeMB`). El pack real es **un archivo**; la UI muestra MB del extract, no miles de GET.

## Contrato hacia `TrekMap`

```ts
offlinePackPath?: string; // V1/V2: uri del .pmtiles (o .mbtiles en V2)
```

Hoy (V1) `TrekMap.offlinePackPath` resuelve el formato:
- `.pmtiles` (http/https o ya prefijado `pmtiles://`) → fuente `pmtiles://` + estilo vectorial andino.
- `.mbtiles` → no se pinta el fondo en Expo Go/web; el GPX/trail sí. Hay que convertir: `pmtiles convert ruta.mbtiles ruta.pmtiles`.

La descarga a disco está implementada en
`src/infrastructure/persistence/tileCacheDB.ts` con `expo-file-system`: descarga
a temporal, valida, mueve ambos archivos y publica el manifiesto solo después de
completar el par. No debe confundirse con el legado retirado `tileCache.ts`, que
persistía PNG como data-URI.

## Riesgos HU-04

| Riesgo | Mitigación |
|---|---|
| OSMF / ToS de teselas raster | No bajar PNG de OSM; usar extract Protomaps/OpenFreeMap o pack propio |
| OPFS / WebView en Android viejo | Fallback: mensaje “mapa base no disponible”; el track GPX sí se ve |
| Pack > 100 MB | Zooms 12–16, bbox con buffer, progreso + cancel |
| V2 saca de Expo Go | No mezclar: o se itera HU-04 en PMTiles V1, o el equipo entero pasa a dev client |

## Verificación T9 y límites actuales

Evidencia de contratos y persistencia simulada: `offline_bundle.test.ts`, `storage_rules_route_bundle.test.ts`,
`offline_hu4.test.ts`, `offline_map_fallback.test.ts`, `map_pack_formats.test.ts`
y `route_publication_artifacts.test.ts`, además de `npm test`, `npm run lint`,
`npx expo-doctor` y `git diff --check`. `npm test` es mayormente local pero
conserva un smoke existente de conectividad Firestore; no sustituye al
Firebase Emulator ni prueba el dispositivo.

Pendiente antes de superar 90%: Firebase Emulator/Storage real, UI en Expo Go,
Android/iOS físico con Storage local y renderer PMTiles en frío/modo avión,
recuperación de app terminada y endurance. El fallback de GPX/trail es
intencional y no equivale a un mapa base vectorial renderizado.

No hay downloader de PNG, caché raster, data-URI ni árbol `{z}/{x}/{y}` en el
repositorio. La ruta canónica es `TrekMap` + `offlinePackPath`; GPX y PMTiles
permanecen como archivos locales fuera de Firestore.
