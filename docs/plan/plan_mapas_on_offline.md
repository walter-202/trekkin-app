# Plan Maestro de Mapas — Trekkin App (v7)

> **Canónico.** Sustituye la V1 basada en `react-native-maps` + `UrlTile` (v6).
> Formatos de pack (PMTiles/MBTiles) y roadmap HU-04: `docs/plan/offline_maps.md`.

## 1. Visión (se mantiene) y corrección del motor (cambia)

La separación de **qué se muestra** estaba bien. Falló **con qué se pinta**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CATÁLOGO (HU-03 Lista)                                                   │
│    Foto de portada. 0 MB de mapa, 0 teselas, 60 FPS.                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. DETALLE DE RUTA (HU-03) — ONLINE, SIN DESCARGAR PACK                     │
│    Un solo componente: <TrekMap />                                          │
│    Motor: MapLibre GL JS (datos OSM vía OpenFreeMap, 0 API keys)            │
│    • Web: GL JS en el DOM                                                   │
│    • Android / iOS Expo Go: el mismo GL JS dentro de WebView                │
│    Dibuja: polyline del trazado + inicio/fin/checkpoints                    │
│    Botón [Descargar] es HU-04, no hace falta para consultar el detalle      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. CAMPO (HU-04, HU-06, HU-07, HU-08)                                       │
│    Mismo <TrekMap />. El pack (PMTiles/MBTiles) es la capa de FONDO.        │
│    El GPX/GeoJSON es la capa de USUARIO. No son lo mismo.                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. V1 vs V2 (runtime, no dos apps)                                          │
│    • V1 ahora: MapLibre GL JS — Expo Go + web localhost, 1 motor JS         │
│    • V2 cuando haga falta GPU / OfflineManager:                             │
│      @maplibre/maplibre-react-native + expo prebuild (dev client)           │
│      Mismo TrekMapProps; solo cambia TrekMap.native.tsx                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Por qué se descartó `react-native-maps` (v6)

| Supuesto v6 | Realidad |
|---|---|
| Android pinta OSM con `<UrlTile>` sin Google | En Android el `MapView` **es** el SDK de Google. `UrlTile` es overlay. Sin API key de billing: lienzo oscuro + logo Google. |
| OpenFreeMap entra en `UrlTile` | OpenFreeMap es estilo **vectorial** MapLibre, no PNG `{z}/{x}/{y}`. |
| Web se resuelve en Expo Go | `react-native-maps` no tiene renderer web. El fallback “Vista Web — Trekkin Bolivia” era intencional. |
| Offline = miles de PNG en `{z}/{x}/{y}` | Choca con OSMF, con el informe al cliente (un paquete) y no cabe en `UrlTile`/`file://` de forma fiable. |

iOS se veía bien porque `PROVIDER_DEFAULT` ahí es Apple Maps (gratis). Eso no desbloquea Android, web ni HU-04.

## 2. Un motor, un contrato, dos plataformas

```
presentation/components/map/TrekMap.tsx          # reexport TS
  ├── TrekMap.web.tsx                            # MapLibre GL JS en el DOM
  └── TrekMap.native.tsx                         # mismo GL JS en WebView
infrastructure/map/mapStyle.ts                   # OpenFreeMap + URLs CDN
infrastructure/map/mapBridge.ts                  # TrekMapScene / eventos
```

**Paquetes V1:** `maplibre-gl` (tipos / referencia; el runtime web y el WebView cargan GL JS 5.6.1 por CDN) + `react-native-webview` (incluido en Expo Go).  
**Se quita:** `react-native-maps`.  
**No se instala aún:** `@maplibre/maplibre-react-native` (rompe Expo Go).

`PlanMap.tsx` y `OfflineRouteMap.tsx` quedan **deprecated**; las vistas usan `TrekMap`.

## 3. Trazabilidad backlog

| Módulo | Backlog | Alcance v7 |
|---|---|---|
| **F0 Map Service** | BK-002, BK-003, BK-004 | `TrekMap` MapLibre GL. Catálogo sin mapas. |
| **F0 nativo GPU** | BK-001 | V2: plugin MapLibre Native + `expo prebuild`. No bloquea V1. |
| **F1 Offline** | BK-010…014 | Un archivo PMTiles/MBTiles o `OfflineManager` (V2). No árbol PNG. Ver `offline_maps.md`. |
| **F2 GPS** | BK-020…023 | Dominio puro (ya hecho). Tracking sobre `TrekMap`. |
| **F3 Firestore** | BK-030…033 | Sin cambio: no depende del renderer. |
| **F4 HU** | BK-040…044 | Detalle, plan, tracking, descargas → `<TrekMap />`. |

## 4. Cómo probar (V1 — sin rebuild nativo)

Requisito: red (OpenFreeMap + CDN de MapLibre). HU-03 **no** descarga pack.

```bash
pnpm install          # o npm install si pnpm falla por symlinks en Windows
pnpm start            # Metro
```

### Web (localhost)

1. En la terminal de Metro: tecla `w`, o `pnpm run web`.
2. Abrir **http://localhost:8081** (si Expo indica otro puerto, usar ese).
3. Continuar como invitado → Explorar → una ruta (p. ej. Illimani).
4. El bloque del mapa debe mostrar **calles/relieve OpenFreeMap** (estilo oscuro), polyline verde y pines de inicio/fin. No el placeholder “Vista Web — Trekkin Bolivia”.

### Expo Go (Android / iPhone)

1. Misma Wi‑Fi que el PC. `pnpm start` → QR.
2. Android: el contenedor **no** debe quedar negro con logo Google. Debe verse el mapa vectorial (atribución OpenStreetMap / OpenFreeMap, no Google).
3. iPhone: mismo mapa MapLibre (ya no Apple Maps). Gesto pan/pinch sobre el mapa.
4. Planificar ruta (HU-07): tap en el mapa debe fijar coordenadas.

Si el WebView queda en verde oscuro vacío: hay red, ¿carga `unpkg.com` y `tiles.openfreemap.org`? Sin red no hay estilo V1.

## 5. Cómo pasar a paquete nativo (V2 — solo cuando se necesite)

V2 **no** es para desbloquear el detalle: V1 ya pinta. V2 es para GPU, logo Google 0, y `OfflineManager` de campo.

```bash
pnpm exec expo install @maplibre/maplibre-react-native
```

En `app.json` → `plugins`: `"@maplibre/maplibre-react-native"`.

```bash
npx expo prebuild
npx expo run:android          # genera APK de desarrollo e instala
npx expo run:ios              # macOS
# o
eas build --profile development --platform android
```

Luego `TrekMap.native.tsx` pasa de WebView a `MapView` de MapLibre Native. **Las vistas no se tocan** (`TrekMapProps` igual).  
Esto **saca al equipo de Expo Go** para esa binaria: se abre el dev client, no la app Expo Go.

OTA (`eas update`) no instala MapLibre Native: hace falta rebuild.

## 6. Arquitectura por entrega (sin inflar el bundle)

### Entrega 1 — Visualización (HU-03) — HECHA en código v7

- Catálogo: foto. Cero mapas.
- `TrekMap` online OpenFreeMap.
- Contrato `TrekMapProps` (`trail`, `track`, markers, `onPress`, `fitTo`).

### Entrega 2 — Formatos GPS (HU-07/08/05/06) — dominio hecho + toGeoJSON

`trackFormats.ts` (`parseGPX`, `buildGPX`/`buildGPX11`, `toGeoJSON`), import/export GPX. No depende del renderer.

### Entrega 3 — Pack offline (HU-04) — detección hecha, downloader pendiente

`mapPackFormats.ts` clasifica PMTiles vs MBTiles. `TrekMap.offlinePackPath` pinta PMTiles en V1. MBTiles = convertir. Estimación por bbox sigue en `geoBounds.ts`. **Prohibido** scrapear `tile.openstreetmap.org`.

### Entrega 4 — Firestore — hecha, paralela

Paginación, chunks, `persistentLocalCache`.

## 7. Verificación

```bash
pnpm run lint     # tsc --noEmit → 0 errores
pnpm test         # suites actuales
npx expo-doctor   # tras tocar app.json / deps nativas (V2)
```

Matriz manual: web localhost + Expo Go Android + Expo Go iOS del detalle HU-03. 100% de HU-03 solo con esa matriz + OK del usuario.
