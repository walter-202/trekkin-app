# MARCO PRÁCTICO

> Análisis del problema y **planificación Scrum**: requerimientos, historias, Product Backlog, priorización y plan de sprints.
> El detalle implementado de cada sprint está en [03-sprints.md](03-sprints.md).

---

## 1. Análisis de los datos

### 1.1 Origen de la información

La problemática se caracterizó con:

1. Revisión de necesidades de planificación y navegación de rutas en contexto de montaña boliviana (señal intermitente).
2. Lectura de requisitos de dominio: mapas offline, tracks GPS, intercambio GPX, roles de comunidad.
3. Especificación viva de historias de usuario en `docs/USER_STORIES.md` con criterios de aceptación verificables.
4. Estado real de implementación y backlog técnico (`docs/BACKLOG.md`, suites en `src/tests/`).

### 1.2 Situación actual (sin la solución)

- Consultar una ruta implica depender de apps que recargan contenido en línea o de documentos sueltos.
- En zona sin señal, el mapa base y a menudo la ficha dejan de estar disponibles.
- Planificar un track, caminarlo y exportarlo exige combinar herramientas ajenas sin trazabilidad de calidad.
- Administrar una comunidad de usuarios requiere roles, bloqueos y auditoría fuera de una app improvisada.

### 1.3 Dificultades identificadas

| Área            | Situación identificada                                                                 |
| :-------------- | :------------------------------------------------------------------------------------- |
| Conectividad    | El mapa y el detalle de la ruta no cargan sin datos móviles.                           |
| Planificación   | No hay un flujo único: trazar puntos, importar GPX/KML y pasar a grabación GPS.        |
| Campo           | Falta guía visual de posición sobre el trazado oficial con métricas en vivo.           |
| Intercambio     | Dificultad para exportar/importar tracks en formatos que entiendan otras herramientas. |
| Comunidad       | Sin catálogo curado, roles ni bitácora de administración.                              |
| Escala de datos | Riesgo de colapsar documentos/cloud si se guardan miles de puntos GPS en Firestore.    |

### 1.4 Necesidades identificadas

- Explorar rutas publicadas sin crear cuenta (modo visitante / guest).
- Ver distancia, tiempo, desnivel, dificultad y checkpoints antes de salir.
- Descargar ruta + mapa base para usar en modo avión.
- Planificar un borrador o importar un archivo de ruta.
- Grabar la caminata con GPS, pausar, finalizar y exportar GPX.
- Compartir la ruta por enlace.
- Registrarse, iniciar sesión, mantener el perfil y, para admin, gestionar usuarios y roles con auditoría.

### 1.5 Interpretación de los datos

Los resultados respaldan una solución móvil con **catálogo + offline + GPS + comunidad**, sobre arquitectura por capas y un modelo de datos pequeño pero bien reglado (Firestore rules, sin arrays gigantes). La prioridad del Product Backlog concentra el esfuerzo en lo que desbloquea el valor en campo: mapa, detalle, descarga y grabación; la calidad de cierre (dispositivo, emulator, reviews) no es opcional: es parte del Definition of Done del equipo.

---

## 2. Planificación Scrum

### 2.1 Visión general

El desarrollo de Trekkin App se estructuró de forma incremental con Scrum: un Product Backlog consolidado (requerimientos + HU + tareas técnicas BK), priorizado con MoSCoW, dividido en **5 sprints de dos semanas**. Cada sprint entrega un incremento trazable a historias de usuario y deja evidencia de pruebas (suites / lectura de código / gates).

---

## 3. Fase de requerimientos

### 3.1 Requerimientos funcionales

Fichas consolidadas (prioridad alineada al MVP actual del equipo).

| Código | Título                       | Prioridad | Descripción breve                                                              | HU              |
| :----- | :--------------------------- | :-------- | :----------------------------------------------------------------------------- | :-------------- |
| RF-01  | Registrar cuenta             | Must      | Alta con nombre, correo, alias, contraseña y aceptación de normas; rol `user`. | HU-01           |
| RF-02  | Iniciar / cerrar sesión      | Must      | Login con Zod, sesión persistente, logout seguro.                              | HU-02           |
| RF-03  | Editar perfil                | Should    | Actualizar `displayName` / `username`; correo solo lectura.                    | HU-02           |
| RF-04  | Explorar catálogo público    | Must      | Lista paginada de rutas publicadas con búsqueda y filtros.                     | HU-03           |
| RF-05  | Ver detalle de ruta          | Must      | Métricas, itinerario, checkpoints y mapa online `TrekMap`.                     | HU-03           |
| RF-06  | Publicar / revisar ruta      | Must      | Flujo `draft → published` con preview acotado de geometría.                    | HU-03 / admin   |
| RF-07  | Estimar y descargar offline  | Must      | Estimación de tamaño; descarga GPX + PMTiles con manifiesto.                   | HU-04           |
| RF-08  | Consultar en modo avión      | Must      | Resolver `offlinePackPath` y fallback si no hay renderer.                      | HU-04           |
| RF-09  | Compartir ruta               | Must      | Deep link `trekkin-app://r/{id}` + share sheet + copiar enlace.                | HU-05           |
| RF-10  | Exportar / importar tracks   | Must      | GPX 1.1 (export) y GPX/KML/CSV (import).                                       | HU-05 / 07 / 08 |
| RF-11  | Seguir ruta con GPS          | Must      | Trazado oficial + track GPS + HUD sobre `TrekMap`.                             | HU-06           |
| RF-12  | Checkpoints por proximidad   | Should    | Visita automática (`isNearM`) y manual.                                        | HU-06           |
| RF-13  | Pausa / reanudar / finalizar | Must      | Estados `completed` / `incomplete`, autosave local, sync.                      | HU-06 / 08      |
| RF-14  | Planificar nueva ruta        | Must      | Nombre obligatorio, waypoints, importación, borrador dual (Firestore + local). | HU-07           |
| RF-15  | Editar borradores            | Should    | Listar y editar drafts; edición geométrica fina (undo/clear/drag).             | HU-07           |
| RF-16  | Grabar ruta nueva            | Must      | Muestreo GPS, limpieza de ruido, descarte `accuracy > 25 m`.                   | HU-08           |
| RF-17  | Checkpoints al grabar        | Should    | 7 categorías Zod + alta manual en posición GPS.                                | HU-08           |
| RF-18  | Resumen de actividad         | Must      | Distancia, ritmo, velocidad, desnivel; persistencia local.                     | HU-08           |
| RF-19  | Listar usuarios (admin)      | Must      | Paginación cursor + filtros en memoria.                                        | HU-10           |
| RF-20  | Bloquear / desbloquear       | Must      | Modal de confirmación + `accountLogs`; anti-autobloqueo.                       | HU-10           |
| RF-21  | Cambiar roles                | Must      | Solo `user` ↔ `admin` con auditoría.                                           | HU-10           |
| RF-22  | Guest / explorar sin cuenta  | Must      | `continueAsGuest` solo en memoria; gate de escritura pide sesión.              | HU-03           |

### 3.2 Requerimientos no funcionales

| Código | Aspecto                 | Definición                                                            | Métrica / evidencia                     |
| :----- | :---------------------- | :-------------------------------------------------------------------- | :-------------------------------------- |
| RNF-01 | Portabilidad            | Expo managed; iOS/Android/web vía Metro                               | `npm start` / Expo Go / web sin eject   |
| RNF-02 | Seguridad de datos      | Reglas Firestore por colección y rol                                  | `firestore.rules` + suites de reglas    |
| RNF-03 | Integridad de sesión    | Sesión persistente; sin fallback ante credencial inválida             | `trekkin_auth_user` + `isNetworkError`  |
| RNF-04 | Rendimiento de catálogo | Consultas con límite y cursor                                         | `listPublishedRoutesPaginated`          |
| RNF-05 | Offline                 | Un paquete GPX+PMTiles por ruta; sustitución atómica                  | manifiesto v2 en `tileCacheDB`          |
| RNF-06 | Precisión GPS           | Descarte de puntos con `accuracy > 25 m`                              | `RecordPoint` / activity tests          |
| RNF-07 | Interoperabilidad       | GPX 1.1 válido para herramientas externas                             | `buildGPX11` + suites `track_formats`   |
| RNF-08 | Calidad de código       | `tsc --noEmit` en 0 errores; suites en verde                          | `npm run lint`, `npm test`              |
| RNF-09 | Diseño                  | Tokens solo desde `AndeanTheme`; primitivas `Button`/`Field`/`Banner` | `docs/DESIGN_RULES.md`                  |
| RNF-10 | Escala de datos         | Sin arrays GPS grandes en Firestore                                   | Política anti-colapso (§ marco teórico) |

### 3.3 Reglas de negocio

| Código | Regla                                                                                                      | Aplicación                  |
| :----- | :--------------------------------------------------------------------------------------------------------- | :-------------------------- |
| RN-01  | Solo rutas con `status === 'published'` son públicas y compartibles.                                       | Catálogo, share, guest      |
| RN-02  | Toda escritura sensible exige sesión válida y no bloqueada.                                                | Gate en `App.tsx`, rules    |
| RN-03  | El rol `admin` es el único que bloquea, desbloquea o cambia roles.                                         | HU-10, `hasRole(['admin'])` |
| RN-04  | `accountLogs` es inmutable y siempre registra `actorId === auth.uid`.                                      | Auditoría admin             |
| RN-05  | El preview de geometría publicada es versionado y acotado; los waypoints completos no se exponen públicos. | Publicación HU-03           |
| RN-06  | Los puntos GPS largos no se escriben como arrays/subcolecciones en Firestore.                              | Anti-colapso                |
| RN-07  | La actividad finaliza `completed` o `incomplete` según llegada / corte; no hay estado silencioso de éxito. | HU-06 / HU-08               |
| RN-08  | El guest no persiste sesión ni puede ejecutar escrituras protegidas.                                       | HU-03                       |

---

## 4. Historias de usuario y criterios de aceptación

> Narrativa y criterios canónicos: `docs/USER_STORIES.md`. Resumen formal para el informe:

### HU-01 — Registrar cuenta (visitante → usuario)

| Campo               | Detalle                                                                                                                                     |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------ |
| Código              | HU-01                                                                                                                                       |
| Actor               | Visitante                                                                                                                                   |
| Como                | Quiero crear una cuenta con mis datos                                                                                                       |
| Para                | Acceder a funciones protegidas y gestionar mi perfil                                                                                        |
| Criterios (resumen) | Campos obligatorios completos; validación Zod; error amigable `email-already-in-use`; rol `user`; post-registro `signOut` y retorno a login |
| Estado              | 🟢 95%                                                                                                                                      |

### HU-02 — Sesión, perfil e identidad

| Campo               | Detalle                                                                                                                                                  |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código              | HU-02                                                                                                                                                    |
| Actor               | Usuario registrado / admin                                                                                                                               |
| Como                | Quiero iniciar sesión, ver mi perfil y cerrar sesión                                                                                                     |
| Para                | Mantener mi identidad y sesión seguras                                                                                                                   |
| Criterios (resumen) | `LoginSchema`; distinción red vs credencial; `isBlocked` rechaza; sesión persistente; avatar + badge de rol; edición de nombre/alias; logout purga local |
| Estado              | 🟢 90%                                                                                                                                                   |

### HU-03 — Explorar y consultar rutas

| Campo               | Detalle                                                                                                                                                                    |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código              | HU-03                                                                                                                                                                      |
| Actor               | Visitante / senderista                                                                                                                                                     |
| Como                | Quiero explorar el catálogo y ver el detalle con mapa                                                                                                                      |
| Para                | Evaluar la excursión antes de salir                                                                                                                                        |
| Criterios (resumen) | Guest libre; búsqueda + chips de dificultad; `RouteCard` sin mapas en el feed; `RouteDetailView` + `TrekMap`; paginación; cache local del detalle; publicación con preview |
| Estado              | 🟢 90%                                                                                                                                                                     |

### HU-04 — Descargar ruta offline

| Campo               | Detalle                                                                                                                                                               |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código              | HU-04                                                                                                                                                                 |
| Actor               | Senderista autenticado                                                                                                                                                |
| Como                | Quiero descargar ruta + mapa                                                                                                                                          |
| Para                | Consultarla sin internet                                                                                                                                              |
| Criterios (resumen) | Descarga solo autenticado y con par GPX+PMTiles válido; estimación de tamaño; verificación de hash/cabecera; traza desde GPX parseado; `offlinePackPath` con fallback |
| Estado              | 🟡 80%                                                                                                                                                                |

### HU-05 — Compartir ruta publicada

| Campo               | Detalle                                                                                                 |
| :------------------ | :------------------------------------------------------------------------------------------------------ |
| Código              | HU-05                                                                                                   |
| Actor               | Usuario                                                                                                 |
| Como                | Quiero compartir una ruta pública                                                                       |
| Para                | Difundirla con mi grupo                                                                                 |
| Criterios (resumen) | Botón en detalle; solo `published`; URL canónica; modal con copiar; share sheet; deep link en `App.tsx` |
| Estado              | 🟢 80%                                                                                                  |

### HU-06 — Realizar una ruta existente

| Campo               | Detalle                                                                                                                           |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------- |
| Código              | HU-06                                                                                                                             |
| Actor               | Senderista registrado                                                                                                             |
| Como                | Quiero seguir una ruta con GPS en vivo                                                                                            |
| Para                | Guiarme y guardar mi historial                                                                                                    |
| Criterios (resumen) | Prepare + Tracking sobre `TrekMap`; checkpoints; pausa/finaliza; background GPS implementado (evidencia de dispositivo pendiente) |
| Estado              | 🟡 75%                                                                                                                            |

### HU-07 — Planificar nueva ruta (borrador)

| Campo               | Detalle                                                                                                   |
| :------------------ | :-------------------------------------------------------------------------------------------------------- |
| Código              | HU-07                                                                                                     |
| Actor               | Senderista autenticado                                                                                    |
| Como                | Quiero trazar o importar una ruta                                                                         |
| Para                | Consolidar datos antes de la expedición                                                                   |
| Criterios (resumen) | Nombre obligatorio; waypoints; import GPX/KML/CSV; dual Firestore draft + autosave local; drafts y editor |
| Estado              | 🟢 85%                                                                                                    |

### HU-08 — Grabar ruta con GPS

| Campo               | Detalle                                                                                                                         |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Código              | HU-08                                                                                                                           |
| Actor               | Senderista autenticado                                                                                                          |
| Como                | Quiero registrar el trayecto                                                                                                    |
| Para                | Medir distancia real y exportar GPX                                                                                             |
| Criterios (resumen) | Muestreo + `cleanTrack` + `accuracy > 25 m`; checkpoints; resumen; export GPX 1.1; sin arrays en Firestore; handoff desde HU-07 |
| Estado              | 🟢 85%                                                                                                                          |

### HU-09 — Moderación

**Eliminada** por el equipo. No hay rol `moderator`. Revisión = admin.

### HU-10 — Gestionar usuarios y roles

| Campo               | Detalle                                                                                                                          |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| Código              | HU-10                                                                                                                            |
| Actor               | Administrador                                                                                                                    |
| Como                | Quiero listar, bloquear y cambiar roles                                                                                          |
| Para                | Asegurar la plataforma                                                                                                           |
| Criterios (resumen) | Visible solo `admin`; filtros; detalle de usuario; bloqueo con modal + `accountLogs`; roles solo `user`↔`admin`; logs inmutables |
| Estado              | 🟢 90%                                                                                                                           |

---

## 5. Product Backlog

Ítems de backlog de producto (HU + tareas técnicas de soporte). Story points (SP) son estimación relativa de equipo (escala Fibonacci).

| Ítem  | Módulo    | Requisito / entrega                         | HU       | SP  | Prioridad |
| :---- | :-------- | :------------------------------------------ | :------- | :-- | :-------- |
| PB-01 | Cuenta    | RF-01 Registro                              | HU-01    | 5   | Must      |
| PB-02 | Sesión    | RF-02 Login / logout                        | HU-02    | 5   | Must      |
| PB-03 | Perfil    | RF-03 Editar perfil                         | HU-02    | 3   | Should    |
| PB-04 | Explorar  | RF-04 Catálogo paginado                     | HU-03    | 8   | Must      |
| PB-05 | Explorar  | RF-05 Detalle + mapa                        | HU-03    | 8   | Must      |
| PB-06 | Explorar  | RF-06 Publicación + preview                 | HU-03    | 5   | Must      |
| PB-07 | Guest     | RF-22 Explorar sin cuenta                   | HU-03    | 3   | Must      |
| PB-08 | Mapa base | Motor MapLibre + `TrekMap` (BK-002/003)     | HU-03    | 8   | Must      |
| PB-09 | Offline   | RF-07 Descarga GPX+PMTiles                  | HU-04    | 8   | Must      |
| PB-10 | Offline   | RF-08 Modo avión / fallback                 | HU-04    | 5   | Must      |
| PB-11 | Offline   | Estimación y progreso (BK-011/014)          | HU-04    | 3   | Should    |
| PB-12 | Compartir | RF-09 Deep link + share                     | HU-05    | 5   | Must      |
| PB-13 | Guía      | RF-11 Tracking en `TrekMap`                 | HU-06    | 8   | Must      |
| PB-14 | Guía      | RF-12 Checkpoints proximidad                | HU-06    | 5   | Should    |
| PB-15 | Guía      | RF-13 Pausa / finish / sync                 | HU-06    | 5   | Must      |
| PB-16 | Plan      | RF-14 Crear borrador                        | HU-07    | 8   | Must      |
| PB-17 | Plan      | RF-10 Importar track                        | HU-07    | 5   | Must      |
| PB-18 | Plan      | RF-15 Undo / clear / drag (BK-041)          | HU-07    | 3   | Should    |
| PB-19 | Grabar    | RF-16 Grabación + cleanTrack                | HU-08    | 8   | Must      |
| PB-20 | Grabar    | RF-17 Checkpoints al grabar                 | HU-08    | 5   | Should    |
| PB-21 | Grabar    | RF-18 Resumen + export GPX                  | HU-08    | 5   | Must      |
| PB-22 | Grabar    | Handoff plan → GPS                          | HU-07/08 | 3   | Must      |
| PB-23 | Admin     | RF-19 Lista paginada usuarios               | HU-10    | 5   | Must      |
| PB-24 | Admin     | RF-20 Bloqueo + auditoría                   | HU-10    | 5   | Must      |
| PB-25 | Admin     | RF-21 Cambio de roles                       | HU-10    | 3   | Must      |
| PB-26 | Datos     | Anti-colapso + reglas (BK-030/031)          | Todas    | 8   | Must      |
| PB-27 | Calidad   | Suites HU-01…HU-08 (BK-043)                 | Todas    | 5   | Must      |
| PB-28 | Calidad   | Matriz dispositivo + UI review (BK-051/052) | Todas    | 5   | Must      |
| PB-29 | Docs      | USER_STORIES / DATABASE / informes          | Todas    | 2   | Should    |
| PB-30 | Password  | Cambio de contraseña (BK-042 parcial)       | HU-02    | 3   | Could     |

---

## 6. Priorización del Product Backlog (MoSCoW)

- **Must Have (MVP):** PB-01, PB-02, PB-04…PB-10, PB-12, PB-13, PB-15, PB-16, PB-17, PB-19, PB-21…PB-28.
- **Should Have:** PB-03, PB-11, PB-14, PB-18, PB-20, PB-29.
- **Could Have (V2 / pulido):** PB-30, V2 nativo MapLibre (`BK-001 🔄`), theme toggle, etc.
- **Won't Have (fuera de alcance vigente):** HU-09 / rol moderador; facturación; segundo motor de mapas (`react-native-maps`); subcolecciones `points/chunk` en Firestore.

---

## 7. Planificación de sprints

El MVP se estructura en **5 sprints de dos semanas**:

| Sprint | Nombre              | Ventana (orientativa) | Objetivo principal                               | Ítems                                       |
| :----- | :------------------ | :-------------------- | :----------------------------------------------- | :------------------------------------------ |
| **S1** | Identidad y base    | Semanas 1–2           | Cuentas, sesión, Gate, tema, scaffold limpio     | PB-01, PB-02, PB-03 (parcial), PB-26 (base) |
| **S2** | Explorar y mapa     | Semanas 3–4           | Catálogo, detalle, `TrekMap`, guest, publicación | PB-04…PB-08, PB-12 (inicio), PB-26          |
| **S3** | Planificar y grabar | Semanas 5–6           | HU-07 + HU-08 + formatos GPS                     | PB-16…PB-22, PB-27                          |
| **S4** | Offline y guía      | Semanas 7–8           | HU-04 + HU-06 en campo                           | PB-09…PB-11, PB-13…PB-15                    |
| **S5** | Comunidad y calidad | Semanas 9–10          | HU-05 completa + HU-10 + gates                   | PB-12 (cierre), PB-23…PB-25, PB-28, PB-29   |

> Cada sprint se documenta con **análisis, diseño, implementación y pruebas** en [03-sprints.md](03-sprints.md).

---

## 8. Definición de Done (equipo)

Un ítem del backlog se considera terminado cuando:

1. Está enlazado a una HU y a criterios de aceptación.
2. Implementado en las capas correctas (sin reglas de negocio en la vista).
3. `npm run lint` en 0 errores y suites afectadas en verde.
4. Evidencia registrada en `USER_STORIES.md` / `BACKLOG.md`.
5. Para cierre de HU al 100%: matriz de dispositivo + `/ui-review` sin blockers + OK del equipo (regla T9).

---

_Sigue: [03-sprints.md](03-sprints.md)._
