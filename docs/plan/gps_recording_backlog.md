# Backlog Grabación GPS (HU-08) — main vs cruz

> Documento canónico del plan de corrección/reescritura de la grabación GPS.
> Fecha: 2026-09-24 · Alcance: HU-08 (grabar ruta con GPS) + sync de Firestore + plataforma.
> Estado: **P1-1 y P1-3 implementados en `ccpj`; pendiente validación en Expo Go/dispositivo.**

## 1. Diagnóstico actual

### Síntomas reportados (Expo Go, Android e iOS)

| #   | Síntoma                                           | Dispositivo             | Observación                                                                     |
| --- | ------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| S1  | Error al iniciar la grabación                     | iOS (Expo Go)           | `FreeRecordView` muestra `locError` al pedir fix inicial o al arrancar el store |
| S2  | 0 metros al caminar                               | Android e iOS (Expo Go) | `totalDistanceKm` queda en 0; el track no avanza                                |
| S3  | `Unsupported field value: undefined` en Firestore | ambos                   | Campo `gpx.sha256` enviado como `undefined` en `activities/{id}`                |
| S4  | `Background location is limited in Expo Go`       | ambos                   | Grabación con pantalla apagada / app terminada no disponible en Expo Go         |

### Referencia: rama `cruz` sí registró 0.03 km (mismo Expo Go)

`origin/cruz@33e5f92` incluye mejoras que main no tiene:

| Elemento de cruz                  | Descripción                                                                                                                 | Beneficio                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `gpsStats` / `gpsEvents` en store | Contadores: recibidos, aceptados, descartados por `accuracy` / `tooClose` / `tooFar` / `invalid`, con último motivo         | Diagnóstico visible en dispositivo                                              |
| `diagBox` en `TrackingView`       | Panel que imprime esos contadores en pantalla                                                                               | Ver _por qué_ no se registran puntos                                            |
| `mapTrack`                        | Trazado completo en memoria (fuera de la ventana de 300 puntos), hidratado desde SQLite y append tras insert, fix `a98b0f2` | El mapa no "olvida" el track                                                    |
| `followUser` free                 | Fit inicial único en map web/WebView; las actualizaciones GPS no repiten `fitBounds` en free                                | El usuario conserva pan/zoom sin recentrado continuo                            |
| Semilla sin punto fijo            | `recordedPoints: []` al iniciar (no siembra 1 punto)                                                                        | Evita que el 1er fix real se descarte por "demasiado cerca" de una semilla mala |
| 3 intentos de fix                 | `FreeRecordView` reintenta `getCurrentPosition` hasta que `seedQualityCheck` pase                                           | Mayor probabilidad de semilla válida                                            |
| `seedQualityCheck` estricto       | `accuracy == null` cuenta como `low_accuracy`; `fixTimestamp == null` → `stale`                                             | Fix sin calidad no arranca la sesión                                            |

### Causas probables en `main` (por archivo)

| Síntoma         | Causa probable                                                                                                                                                                                                                                                              | Archivo                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| S2 (0 m)        | La distancia solo suma en `recordPoint` si el punto pasa `classifyPointDiscard` (`accuracy ≤ 25`, `Δ ≥ 8 m`, `jump ≤ 400`). Sin diagnóstico no se sabe cuál filtro descarta. Posible: watch no arranca (`gpsWarning`), fase ≠ `in_progress`, o todos los fixes se descartan | `src/infrastructure/persistence/useActivityStore.ts:513-558`, `src/core/application/activity/RecordPoint.usecase.ts`                  |
| S2 (0 m)        | `recordPoint` corre dentro de `enqueue` serial: si la cola está ocupada (SQLite/Firestore), el punto llega tarde o se encola                                                                                                                                                | `useActivityStore.ts` (`enqueue`)                                                                                                     |
| S1 (iOS)        | `getCurrentPosition` falla (permiso/timeout) o `startFreeRecording` lanza (`BeginTracking`, SQLite header); un solo intento de fix                                                                                                                                          | `src/presentation/views/record/FreeRecordView.tsx:47-85`                                                                              |
| S3 (sha256)     | `setDoc` recibe `sha256: undefined` en `gpx` (receipt local sin hash y `pendingGpxMetadata` propagado); Firestore rechaza `undefined` aunque Zod lo marque opcional                                                                                                         | `src/infrastructure/database/activityService.ts:21-37`, `src/core/application/activity/activityGpx.ts`, `useActivityStore.ts:274-327` |
| S4 (background) | Expo Go no permite background location real; requiere development build                                                                                                                                                                                                     | `app.json`, `eas.json` (perfil `development` ya existe)                                                                               |
| —               | Deps fuera de versión esperada por SDK 57                                                                                                                                                                                                                                   | `package.json` (`expo ~57.0.24` → `~57.0.25` + 4 paquetes)                                                                            |

## 2. Backlog priorizado

### P0 — Rompen la HU

| ID       | Tarea                                                                                                                                                                                                                                                                    | Archivos                                                                                                   | Aceptación                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **P0-1** | ✅ **Hecho (2026-09-24):** fix `gpx.sha256: undefined` — `definedOnly` en `transition()` omite claves `undefined`; `stripUndefined` sanea `setDoc` recursivo (incl. arrays)                                                                                              | `activityService.ts`, `activityGpx.ts`, `sanitizeDoc.ts` (nuevo), `activity_gpx_storage.test.ts` (2 casos) | ✅ `npm run lint` 0 · `npm test` 15/15 (sin `sha256` explícito en metadata)   |
| **P0-2** | ✅ **Hecho (2026-09-24):** inicio iOS — `FreeRecordView` distingue permiso denegado vs fix no disponible, 3 intentos de fix con `seedQualityCheck`, mensajes accionables; `locationService.getCurrentPosition` cae a `getLastKnownPositionAsync` si el fix en vivo falla | `FreeRecordView.tsx`, `locationService.ts`                                                                 | ✅ `npm run lint` 0 · `npm test` 15/15 — falta prueba en Expo Go iOS          |
| **P0-3** | ✅ **Hecho (2026-09-24):** diagnóstico GPS — `gpsStats`/`gpsEvents` en store (cuentan SIEMPRE el fix, antes de fase/filtros), panel `diagBox` en `TrackingView`, banner con botón **REINTENTAR GPS**, reset de stats al iniciar/pausar/reanudar/clear                    | `useActivityStore.ts`, `TrackingView.tsx`                                                                  | ✅ `npm run lint` 0 · `npm test` 15/15 — falta prueba en Expo Go con el panel |

### P1 — Robustez de grabación

| ID       | Tarea                                                                                                                   | Archivos                                                              | Aceptación                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **P1-1** | ✅ **Hecho (2026-09-25):** `mapTrack` completo + cámara free con fit inicial único; el trail guiado conserva su ajuste  | `useActivityStore.ts`, `TrackingView.tsx`, `TrekMap*`, `mapBridge.ts` | El trazo no se recorta al superar 300 puntos y free no recentra en cada fix |
| **P1-2** | Arranque sin bloqueo pesado: el watch no debe esperar a SQLite/Firestore de arranque                                    | `useActivityStore.startFreeRecording`, `TrackingView`                 | Primer fix < 3 s tras conceder permiso                                      |
| **P1-3** | ✅ **Hecho (2026-09-25):** Opción A, `recordedPoints: []` al iniciar; la ubicación inicial no se convierte en punto GPS | `StartFreeRecording.usecase.ts`, `FreeRecordView.tsx`                 | El primer fix aceptado es el primer punto persistido                        |
| **P1-4** | `endPoint` = último punto aceptado al finalizar (hoy queda el de inicio)                                                | `FinishActivity.usecase.ts`, store                                    | ResultView muestra el fin real                                              |
| **P1-5** | Fin con confirmación + resumen (punto que confirma el usuario)                                                          | `TrackingView.handleFinish`, `ResultView`                             | Modal "¿Finalizar aquí?" + resumen con distancia real                       |

### P2 — Calidad de track (plan acordado con el equipo)

| ID       | Tarea                                               | Detalle                                                                                                                        |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **P2-1** | Adopción de inicio ≤ 500 m                          | Si el GPS queda lejos del punto planeado, adoptar la posición real / avisar (umbral ya existe en `PrepareView`)                |
| **P2-2** | `decidePoint`: distancia + heading + heartbeat 25 s | Muestreo no lineal en `RecordPoint.usecase.ts`                                                                                 |
| **P2-3** | RDP solo en export + veto de ápices de giros        | `ExportTrackFile.usecase.ts` + `simplifyTrack` con preservación de giros; tolerancia día 5 m / multi-día 10 m, tope ~8k puntos |

### P3 — Plataforma y dependencias

| ID       | Tarea                                                                   | Detalle                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P3-1** | Actualizar deps SDK 57                                                  | `npx expo install --check`: `expo@57.0.25`, `expo-location@57.0.20`, `expo-task-manager@57.0.20`, `expo-linking@57.0.11`, `expo-sharing@57.0.22`                |
| **P3-2** | Development build (posterior, **obligatorio**: background es requisito) | `npx expo install expo-dev-client` → `npx eas build --profile development` → probar grabación con pantalla apagada. `eas.json` ya tiene el perfil `development` |
| **P3-3** | Verificar permisos                                                      | `app.json`: iOS `NSLocationWhenInUseUsageDescription` / `NSLocationAlwaysAndWhenInUseUsageDescription`; Android `ACCESS_FINE_LOCATION` + background             |

## 3. Orden de ejecución

```
1. P0-1  sha256 (rápido, desbloquea sync)
2. P0-3  0 m (diag gpsStats + watch + phase)
3. P0-2  error iOS (reintentos + UX)
4. P1-1  mapTrack
5. P1-2  arranque sin cola
6. P3-1  deps (expo install --check)
7. P1-3  semilla robusta
8. P1-4  endPoint real
9. P1-5  fin con confirmación
10. P2-*  adopción / decidePoint / RDP
11. P3-2 + P3-3  dev build + permisos (background real)
```

## 4. Verificación por tarea

```bash
npm run lint        # tsc --noEmit — debe quedar en 0 errores
npm test            # suites HU-08: activity_hu8, activity_record_sqlite, activity_track_db, background_location, activity_gpx_storage
npx expo-doctor     # obligatorio si se tocan deps, app.json o permisos
```

Prueba manual en Expo Go del flujo tocado (Android + iOS). Si la tarea toca dependencias nativas o permisos → suma `npx expo-doctor`.

## 5. Límites de validación (regla T9)

- HU-08 **no se declara 100%** sin: matriz Expo Go completa, `/ui-review` sin blockers, OK del usuario y — para background — evidencia en dispositivo físico con pantalla apagada / app terminada / endurance.
- Este documento no cambia porcentajes en `docs/USER_STORIES.md`; la evidencia se actualiza allí al cerrar cada tarea.

## 6. Contexto de plataforma

- **Expo Go**: grabación en primer plano OK; background location limitado (log `Background location is limited in Expo Go`). `background_location.test.ts` cubre la lógica pura.
- **Development build**: `eas.json` → perfil `development` con `developmentClient: true` ya preparado; falta instalar `expo-dev-client` y construir (P3-2). Prioridad diferida por decisión del equipo, pero **requerida** para el requisito de grabación con pantalla apagada.
