# trekkin-app — Historias de Usuario (figura oficial del equipo)

Alcance real de este repo: **HU-01, HU-02, HU-03 y HU-07 al 100%; HU-05 al 90%**
(código + pruebas; falta matriz Expo Go). HU-04, HU-06 y HU-08…HU-10
son roadmap con dueños (cada dev detalla sus TAREAS; aquí solo criterios).
**HU-09 eliminada por el equipo: no existe el rol moderador** (roles vigentes: `user`, `admin`).

## HU-01: Registrar Cuenta — ✅ 100% implementada

- **Rol:** Visitante. **Como** usuario nuevo **quiero** registrar una cuenta con mis datos
  **para** acceder a la plataforma y gestionar mi perfil.
- Criterios:
  1. Formulario de registro al seleccionar “Registrarse” (`AuthView`, modo `register`).
  2. Campos: Nombre Completo, Correo, Usuario, Contraseña, Confirmar Contraseña,
     Aceptación de Normas de Seguridad en Montaña.
  3. Validación `RegisterSchema` (zod): datos correctos + correo único (Firebase Auth
     lanza error si el correo existe; duplicado y clave débil se propagan en español).
  4. Rol automático `user` (`RegisterUserUseCase`).
  5. Mensaje de confirmación (“¡Cuenta creada exitosamente!”).
  6. Redirección a inicio de sesión (HU-02, sin auto-sesión: `signOut` tras crear).
- Archivos: `core/domain/auth.schemas.ts` (acepta `@usuario` y lo normaliza),
  `core/application/auth/RegisterUser.usecase.ts` (sin `saveSession`),
  `infrastructure/auth/AuthContext.tsx` (`register(args)` delega al usecase),
  `infrastructure/database/userProfileService.ts`,
  `presentation/views/auth/AuthView.tsx` (éxito → modo `login`) +
  `RegisterForm.tsx` (6 campos) / `LoginForm.tsx` +
  primitivas `presentation/components/ui/` (`Field`, `Button`, `Banner`).
- Nota: `SEED_ADMIN_ACCOUNTS` / `switchDemoRole` / Google aislados como demo fuera de
  criterios; arranque sin sesión (`currentUser = null`).

## HU-02: Iniciar y Cerrar Sesión — ✅ 100% implementada

- **Rol:** Usuario / Administrador. **Como** usuario registrado **quiero** iniciar/cerrar
  sesión **para** acceder de forma segura y gestionar mi información.
- Criterios:
  1. Acceso desde `AuthView` (modo `login`) o funcionalidad que requiera autenticación.
  2. Correo + contraseña de HU-01.
  3. Contraseña oculta con toggle mostrar/ocultar (`Eye`/`EyeOff` en `Field`).
  4. Validación `LoginSchema` + mensajes descriptivos.
  5. Credenciales válidas → sesión + acceso según rol (RBAC: `hasRole`, `isAdmin`).
  6. Credenciales inválidas → error, sin sesión.
  7. Sesión persistente (`storage.ts`, clave `trekkin_auth_user`, AsyncStorage).
  8. Funcionalidades privadas protegidas (`Gate` en `App.tsx`; `isBlocked` bloquea en
     login y en vivo).
  9. Usuario activo visible (avatar, nombre, badge de rol en `HomeView`).
  10. Cierre seguro (`LogoutUserUseCase` + botón Salir; seguro sin red).
- Archivos: `core/application/auth/LoginUser.usecase.ts`, `LogoutUser.usecase.ts`,
  `AuthContext.tsx` (delega a usecases; fallbacks solo por red vía `isNetworkError`),
  `presentation/views/home/HomeView.tsx`, `AuthView.tsx` + `LoginForm.tsx`.

## HU-03: Explorar y consultar ruta — ✅ 100% implementada

- **Dueño oficial:** Chicho. **Como** usuario de la plataforma **quiero** consultar
  el catálogo de rutas públicas, buscar y visualizar el detalle completo de un
  recorrido **para** conocer las características técnicas del trayecto antes de
  realizarlo.
- Gate oficial (figura del equipo): catálogo público; el detalle exige sesión activa.
  Sin sesión, seleccionar una ruta guarda el `routeId` pendiente y continúa al
  detalle automáticamente tras login/registro (`pendingRouteId` en el Gate).
  GPS/offline exigen `isAuthenticated`; lo admin exige `hasRole(['admin'])`.
  Sin HU-09: no hay guard de moderación.

- Criterios:
  1. Ingreso a la app (con o sin sesión) → catálogo de rutas públicas y aprobadas
     (`status == 'published'`). La entrada nunca es login.
  2. Búsqueda por texto + filtro por dificultad (chips) validados con `RouteFiltersSchema` (Zod).
  3. Solo se muestran rutas que coinciden con los criterios (`SearchRoutesUseCase`).
  4. Tarjeta resumen por ruta (`RouteCard`: nombre, distancia, dificultad, tramo inicio→fin,
     foto si `photos[0]` existe).
  5. Selección de ruta sin sesión → `onRequireAuth(routeId)`: el Gate guarda el
     pendiente y va a `AuthView`; tras login continúa al detalle automáticamente.
  6. Detalle con descripción, inicio, final, métricas, características y puntos relevantes
     (`RouteDetailView` + `GetRouteDetailUseCase`, solo `published`).
  7. Mapa interactivo (componente único `PlanMap` en `components/map/` — WebView +
     tiles OpenStreetMap, con `trail` + `pointsOfInterest` para HU-03) con zoom y
     desplazamiento habilitados. Funciona en Expo Go sin API key (requiere internet
     para los tiles).
  8. Sidebar recortado (`components/nav/Drawer.tsx`): visible con o sin sesión, se abre
     con hamburguesa superior; solo INICIO (→ catálogo) y PERFIL (reutiliza HU-01/02,
     con pendiente de perfil si no hay sesión). Sin Descargas/Nueva Ruta/Capas/SOS.
- Archivos: `core/domain/route.schemas.ts` (`RouteSchema`, `RouteFiltersSchema`),
  `core/application/explore/` (`ListPublishedRoutes`, `SearchRoutes`, `GetRouteDetail` usecases
  puros con puertos), `infrastructure/database/routeService.ts` (query `routes`
  `where status == 'published'` + get por id) y `routeSeed.ts` (fallback demo solo ante
  red fallida o colección vacía), `presentation/views/explore/` (`ExploreView` catálogo,
  `RouteCard`, `RouteDetailView`; el mapa es el `PlanMap` compartido),
  `presentation/components/nav/Drawer.tsx` (sidebar), `src/App.tsx`
  (Gate: entrada catálogo; con sesión → catálogo/perfil/record; pendientes ruta/perfil;
  HU-01/02 intactas).
- Nota de mapa: `PlanMap` usa WebView + tiles OSM (sin Google SDK/API key) y funciona
  en Expo Go con internet; `react-native-maps` queda como dependencia sin uso directo
  en este flujo (`npx expo-doctor` en verde).

## HU-04: Descargar ruta offline — dueño: Cusi (scaffold)

- **Rol:** Usuario. **Quiero** descargar una ruta **para** consultarla sin señal.
- Criterios: desde el detalle → “Descargar ruta” → tamaño estimado → confirmación →
  descarga mapa + trazado + info básica → confirmación de completado → consulta sin internet.

## HU-05: Compartir ruta publicada — dueña: Monje — ✅ 90% implementada

- **Rol:** Usuario autenticado. **Quiero** compartir una ruta publicada mediante un enlace
  directo (redes sociales, mensajería o copiar enlace) **para** difundir el recorrido con
  todos sus datos completos sin perder información.
- Criterios:
  1. El usuario abre el detalle de una ruta publicada (solo se llega desde el catálogo,
     que ya solo publica `published`) y presiona **Compartir** (`RouteDetailView`,
     botón Share2 habilitado; antes era placeholder deshabilitado).
  2. `ShareRouteUseCase` valida `status == 'published'` en dominio (zod `RouteSchema`);
     ruta no publicada → error "La ruta no está publicada y no se puede compartir".
  3. Enlace único determinístico `…/r/{routeId}` vía `shareService.buildShareUrl`
     (`expo-linking` `createURL`; el `routeId` de Firestore ya es único → sin persistir
     nada). No se crea colección `shares` ni se duplica la Route.
  4. `ShareModal` muestra resumen (nombre, región, distancia, tiempo, dificultad) +
     el enlace + opciones: **Copiar enlace** (`expo-clipboard`) y **Compartir…**
     (share sheet nativo `react-native` Share: redes sociales/mensajería del dispositivo).
  5. Al copiar → feedback "Enlace copiado"; al completar un envío → confirmación
     **"Ruta compartida exitosamente."** (criterio 9).
  6. Recuperación: un enlace `r/{routeId}` se resuelve en `App.tsx` (`expo-linking`
     `getInitialURL` + listener `url`) con `parseShareLink` (dominio) → `setPendingRouteId`
     → el Gate HU-03 continúa al detalle (con sesión directo; sin sesión tras login).
     La ruta completa (mapa, distancia, tiempo, dificultad…) se obtiene con el
     `GetRouteDetailUseCase` existente. Sin duplicar datos de Route.
- Arquitectura: `core/domain/share.schemas.ts` (zod + `parseShareLink`),
  `core/application/share/` (`ShareRoute`/`CopyShareLink`/`PublishShareLink` usecases
  puros con puertos), `infrastructure/share/shareService.ts` (única capa con
  `Share`/`Clipboard`/`Linking`), `presentation/views/explore/ShareModal.tsx`
  (colocalizado, un solo uso), `RouteDetailView.tsx` (botón activado), `src/App.tsx`
  (deep link). Visual andino (`AndeanTheme`), sin `firebase/*` en UI.
- Dependencias nuevas: `expo-clipboard`, `expo-linking` (alineadas a SDK 57) +
  `"scheme": "trekkin-app"` en `app.json`.
- Verificación: `npm run lint` (0 errores) + `npm run test:hu5` (10 casos) +
  flux HU-05 en Expo Go pendiente de matriz de equipo (`/ui-review` + confirmación).

## HU-06: Realizar una ruta existente — dueños: Tapia, Beymar (scaffold)

- **Rol:** Usuario registrado. **Quiero** recorrer una ruta publicada registrando mi actividad
  **para** ir guiado, monitorear progreso y guardar mi historial.
- Criterios: seleccionar publicada → vista de preparación (info + ubicación/distancia al
  inicio) → “Iniciar actividad” → trazado oficial + posición + inicio/fin/puntos +
  distancia recorrida/restante + tiempo → checkpoints → pausar/reanudar → “Finalizar” →
  completa o incompleta → guarda en historial.

## HU-07: Planificar nueva ruta — dueña: Apaza — ✅ 100% implementada

- **Rol:** Usuario autenticado. **Quiero** guardar una ruta como borrador **para**
  continuar planificando después y confirmar el punto inicial real.

- Criterios:
  1. “Crear nueva ruta” desde el hub (`HomeView` → `RecordView`) con nombre
     provisional obligatorio (sin nombre no se guarda el borrador).
  2. Mapa interactivo (WebView + tiles OpenStreetMap, componente único `PlanMap`).
  3. Punto inicial provisional + destino provisional (taps en el mapa, `PlanPointPicker`).
  4. Guardar como borrador (`SaveDraftUseCase` → `routes/{id}` con `status:'draft'`).
  5. Autosave local (`usePlanStore` + AsyncStorage) → no se pierde al salir.
  6. Recuperar borrador (`DraftsView` + `GetDraftUseCase`).
  7. Modificar antes de iniciar (`PlanEditorView` + `UpdatePlanUseCase`).
  8. Confirmar/modificar punto inicial real con ubicación actual (`expo-location`,
     `StartPointConfirmView` + `ConfirmStartPointUseCase`).
  9. El sistema actualiza el punto inicial confirmado (`startPointConfirmed` local +
     `startPoint` en Firestore).
  10. Ruta lista para grabación GPS (plan local `ready_for_gps` vía `MarkReadyForGpsUseCase`;
      en Firestore queda `draft` por reglas; handoff a HU-08, `ReadyForGpsView`).
- Arquitectura: `core/domain/plan.ts` + `plan.schemas.ts` (zod), 8 use cases en
  `core/application/plan/` (puertos inyectados, sin Firebase/RN), `routeService.ts`
  (única capa que importa `firebase/firestore`), `usePlanStore.ts` (zustand + autosave),
  vistas delgadas en `presentation/views/record/`. La vista no importa `firebase/*`.
- Dependencias nuevas: `react-native-webview` (mapa OSM en Expo Go) + `expo-location` (T8).
- Verificación: `npm run lint` (0 errores) y flujo T11–T20 en Expo Go (iOS o Android).

## HU-08: Grabar ruta con GPS — dueños: Ramos, Cruz (scaffold)

- **Rol:** Usuario. **Quiero** grabar una ruta **para** registrar trayecto, distancia,
  tiempos y guardarlos en mi perfil.
- Criterios: vista “Grabar Recorrido” → permiso ubicación (concede/deniega informado) →
  ubicación en mapa → “INICIAR RUTA” → registro GPS + posición + distancia + tiempo →
  “Añadir Parada” (categoría + nota cuando corresponda + foto opcional) → pausar/reanudar →
  punto final real → resumen (distancia, duración, dificultad sugerida) → publicar.

## HU-10: Gestionar usuarios y roles — dueña: Larico (scaffold)

- **Rol:** Administrador. **Quiero** consultar usuarios, bloquear/desbloquear y asignar roles
  **para** controlar seguridad y permisos.
- Criterios: módulo “Gestión de usuarios” → lista → detalle → bloquear (cuenta bloqueada) →
  desbloquear (rehabilita) → asignar rol (`user` / `admin`) → confirma operación.

## Roadmap (scaffold, no implementado)

| ID    | Historia                         | Dueño         | Ruta futura                                                                 | Estado   |
| ----- | -------------------------------- | ------------- | --------------------------------------------------------------------------- | -------- |
| HU-03 | Explorar y consultar ruta        | Chicho        | `views/explore/` + `routeService`                                           | ✅ 100%  |
| HU-04 | Descarga offline                 | Cusi          | `persistence/tileCacheDB`                                                   | scaffold |
| HU-05 | Compartir ruta publicada         | Monje         | `views/explore/ShareModal` + `shareService` + deep link `r/{id}`            | ✅ 90%   |
| HU-06 | Realizar ruta (actividad GPS)    | Tapia, Beymar | `views/activity/` + `activityService`                                       | scaffold |
| HU-07 | Planificar nueva ruta (borrador) | Apaza         | `views/record/`                                                             | ✅ 100%  |
| HU-08 | Grabar ruta con GPS              | Ramos, Cruz   | `views/record/` + `expo-location` (lee plan local `ready_for_gps` de HU-07) | scaffold |
| HU-10 | Gestionar usuarios y roles       | Larico        | `views/profile/` RBAC admin                                                 | scaffold |

Verificación y estado (90% — HU-01/02/03/07):

```bash
npm run lint   # tsc --noEmit → 0 errores
npm test       # suite HU-01/02 (16 casos, incluye Firestore en vivo)
```

- Verificado: lint 0, suite 16/16, E2E backend 7/7 (registro, perfil, login, reglas),
  login en Expo Go + entrada a HU-07 (“Planificar nueva ruta”) y HU-03 ("Explorar rutas") OK.
- Falta para 100%: matriz Expo Go completa de UI/UX por el equipo + ronda de correcciones
  cruzadas (como la eliminación de HU-09). Nadie declara 100% sin eso (ver `/hu-checklist`).

## Servicios reutilizables HU-01/02 → HU-04… (HU-03 y HU-07 implementadas arriba)

- `useAuth()` (`infrastructure/auth/AuthContext.tsx`): `currentUser`, `isGuest`
  (solo memoria, nunca persiste), `isAuthenticated`, `continueAsGuest()`, `exitGuest()`,
  `hasRole([...])`, `isAdmin`, `login/register/logout`.
- Gate (`src/App.tsx`): con sesión → catálogo/perfil/record; sin sesión → catálogo
  público; `AuthView` solo ante acción gated. Detalle de ruta (HU-03 C5): con gate
  de auth — sin sesión se guarda el `routeId` pendiente y se continúa al detalle
  tras login. Sidebar (`components/nav/Drawer.tsx`): INICIO/PERFIL, con o sin sesión.
- Todo lo que escriba (GPS, offline, publicar) exige `isAuthenticated`; lo admin exige
  `hasRole(['admin'])`. Sin HU-09: no hay guard de moderación.
