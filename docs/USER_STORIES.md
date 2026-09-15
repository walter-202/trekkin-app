# trekkin-app — Historias de Usuario (figura oficial del equipo)

Alcance real de este repo: **HU-01, HU-02, HU-03, HU-07 y HU-10 implementadas**.
HU-04…HU-06 y HU-08 son roadmap con dueños (cada dev detalla sus TAREAS; aquí solo criterios).
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

- **Como** usuario de la plataforma **quiero** consultar el catálogo de rutas públicas,
  buscar y visualizar el detalle completo de un recorrido **para** conocer las
  características técnicas del trayecto antes de realizarlo.
- Decisión de gate (guest libre): catálogo y detalle visibles sin sesión; GPS/offline
  exigen `isAuthenticated` / `hasRole(['admin'])` (el detalle muestra el banner de login, nunca bloquea
  la consulta).
- Criterios:
  1. Ingreso a la app → catálogo de rutas públicas y aprobadas (`status == 'published'`).
  2. Búsqueda por texto + filtro por dificultad (chips) validados con `RouteFiltersSchema` (Zod).
  3. Solo se muestran rutas que coinciden con los criterios (`SearchRoutesUseCase`).
  4. Tarjeta resumen por ruta (`RouteCard`: nombre, distancia, dificultad, tramo inicio→fin).
  5. Selección de ruta → detalle sin exigir sesión (guest libre).
  6. Detalle con descripción, inicio, final, métricas, características y puntos relevantes
     (`RouteDetailView` + `GetRouteDetailUseCase`, solo `published`).
  7. Mapa interactivo (componente único `PlanMap` en `components/map/`, con `trail` +
     `pointsOfInterest` para HU-03) con zoom y desplazamiento habilitados; fallback
     estático en web.
- Archivos: `core/domain/route.schemas.ts` (`RouteSchema`, `RouteFiltersSchema`),
  `core/application/explore/` (`ListPublishedRoutes`, `SearchRoutes`, `GetRouteDetail` usecases
  puros con puertos), `infrastructure/database/routeService.ts` (query `routes`
  `where status == 'published'` + get por id) y `routeSeed.ts` (fallback demo solo ante
  red fallida o colección vacía), `presentation/views/explore/` (`ExploreView` catálogo,
  `RouteCard`, `RouteDetailView`; el mapa es el `PlanMap` compartido), `src/App.tsx`
  (Gate: guest → ExploreView; con sesión → tabs Inicio/Explorar + `RecordView` HU-07;
  HU-01/02 intactas).
- Nota nativa: `react-native-maps` es módulo nativo → requiere dev-build para el mapa
  interactivo (`npx expo-doctor` en verde); en Expo Go clásico el detalle funciona con
  la vista previa del trazado.

## HU-04: Descargar ruta offline — dueño: Cusi (scaffold)

- **Rol:** Usuario. **Quiero** descargar una ruta **para** consultarla sin señal.
- Criterios: desde el detalle → “Descargar ruta” → tamaño estimado → confirmación →
  descarga mapa + trazado + info básica → confirmación de completado → consulta sin internet.

## HU-05: Compartir ruta publicada — dueña: Monje (scaffold)

- **Rol:** Usuario autenticado. **Quiero** compartir una ruta publicada con enlace directo
  **para** difundirla con sus datos completos.
- Criterios: desde “Mis Rutas” → “Compartir” → verifica publicada → enlace único →
  opciones (redes, mensajería, copiar) → adjunta datos completos → confirma envío.

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
  1. “Crear nueva ruta” desde el hub (`HomeView` → `RecordView`).
  2. Mapa interactivo (`react-native-maps`, componente único `PlanMap`).
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
- Dependencias nuevas: `react-native-maps` (mapa, Expo Go) + `expo-location` (T8).
- Verificación: `npm run lint` (0 errores) y flujo T1–T10 en Expo Go.

## HU-08: Grabar ruta con GPS — dueños: Ramos, Cruz (scaffold)

- **Rol:** Usuario. **Quiero** grabar una ruta **para** registrar trayecto, distancia,
  tiempos y guardarlos en mi perfil.
- Criterios: vista “Grabar Recorrido” → permiso ubicación (concede/deniega informado) →
  ubicación en mapa → “INICIAR RUTA” → registro GPS + posición + distancia + tiempo →
  “Añadir Parada” (categoría + nota cuando corresponda + foto opcional) → pausar/reanudar →
  punto final real → resumen (distancia, duración, dificultad sugerida) → publicar.

## HU-10: Gestionar usuarios y roles — dueña: Larico — ✅ implementada (90% pendiente de matriz)

- **Rol:** Administrador. **Quiero** consultar la información de los usuarios registrados,
  bloquear, desbloquear sus cuentas y asignar roles **para** mantener el control y la
  seguridad de la plataforma.
- **Ajuste acordado con el equipo:** el criterio original pegó "asignar rol de Moderador",
  pero la figura oficial eliminó HU-09. Roles vigentes: **`user` / `admin`** (sin moderador).
  El módulo asigna `user` o `admin`; no se re-introduce el rol moderador en types, reglas ni
  UI. La bitácora (T7) solo registra, sin pantalla de historial (fuera de criterios).
- Criterios:
  1. El administrador ingresa al módulo “Gestión de Usuarios” (tab `Usuarios` en `App.tsx`,
     SOLO visible con `isAdmin` → T9/T13).
  2. El sistema muestra los usuarios registrados (`UserManagementView` + `ListUsersUseCase`,
     con barra de búsqueda y filtros de estado/rol validados por `UserFiltersSchema` → T1/T8).
  3. El administrador selecciona un usuario (`UserCard` → `UserDetailView`).
  4. El sistema muestra la información disponible del usuario (nombre completo, alias,
     correo electrónico, rol actual y estado de la cuenta → T2/T6).
  5. El administrador puede bloquear al usuario (botón + modal `ConfirmActionModal` → T3/T4).
  6. El sistema cambia el estado de la cuenta a bloqueada (`BlockUserUseCase`: `isBlocked: true`
     - bitácora `block`; la suscripción en vivo de `AuthContext` invalida la sesión activa → T10).
  7. El administrador puede desbloquear al usuario (`UnblockUserUseCase` → T11).
  8. El sistema habilita nuevamente la cuenta (`isBlocked: false` + bitácora).
  9. El administrador puede asignar el rol `user` o `admin` (chips en el detalle, con
     confirmación → T9).
  10. El sistema actualiza el rol del usuario (`AssignRoleUseCase` + bitácora con
      `previousRole`/`newRole`).
  11. El sistema confirma la operación (`Banner` success + mensaje de confirmación → T5).
- Arquitectura: `core/domain/types.ts` (`AccountLogEntry`) + `userManagement.schemas.ts`
  (zod), 5 casos de uso puros en `core/application/admin/` (puertos inyectados, sin
  Firebase/RN), `infrastructure/database/accountLogService.ts` (única capa que escribe
  `accountLogs`) y `firestore.rules` (colección `accountLogs`, `isValidAccountLog`,
  creación/lectura solo `isAdmin()`), vistas delgadas en `presentation/views/profile/`
  (`UserManagementView`, `UserCard`, `UserDetailView`, `ConfirmActionModal`).
- Sin cambios HU-01/02: `LoginUserUseCase` ya rechazaba cuentas `isBlocked` y `AuthContext`
  ya desloguea en vivo (T12/T16 verificados con test integrado en la suite HU-10).
- Verificación: `npm run lint` (0 errores) y suite `user_management_hu10` (22 casos T1–T17).

## Roadmap (scaffold, no implementado)

| ID    | Historia                      | Ruta futura                                                      | Estado   |
| ----- | ----------------------------- | ---------------------------------------------------------------- | -------- |
| HU-04 | Descarga offline              | `persistence/tileCacheDB`                                        | scaffold |
| HU-05 | Compartir ruta publicada      | modal en explore                                                 | scaffold |
| HU-06 | Realizar ruta (actividad GPS) | `views/activity/` + `activityService`                            | scaffold |
| HU-08 | Grabar ruta con GPS           | `views/record/` + `expo-location` (lee `ready_for_gps` de HU-07) | scaffold |

Verificación y estado (90% — HU-01/02/03/07/10):

```bash
npm run lint   # tsc --noEmit → 0 errores
npm test       # suites HU-01/02 (16 casos, incluye Firestore en vivo) + HU-10 (22 casos T1–T17)
```

- Verificado: lint 0, suite HU-01/02 16/16 + HU-10 22/22, E2E backend 7/7 (registro, perfil,
  login, reglas), login en Expo Go + entrada a HU-07 (“Planificar nueva ruta”), HU-03
  ("Explorar rutas") y HU-10 ("Gestión de usuarios", tab solo admin) OK.
- Falta para 100%: matriz Expo Go completa de UI/UX por el equipo + ronda de correcciones
  cruzadas (como la eliminación de HU-09). Nadie declara 100% sin eso (ver `/hu-checklist`).

## Servicios reutilizables HU-01/02 → HU-04… (HU-03 y HU-07 implementadas arriba)

- `useAuth()` (`infrastructure/auth/AuthContext.tsx`): `currentUser`, `isGuest`
  (solo memoria, nunca persiste), `isAuthenticated`, `continueAsGuest()`, `exitGuest()`,
  `hasRole([...])`, `isAdmin`, `login/register/logout`.
- Gate (`src/App.tsx`): con sesión → tabs `HomeView` / `ExploreView` / `RecordView` (HU-07) y,
  solo con `isAdmin`, el tab `Usuarios` (HU-10);
  guest → `ExploreView` (catálogo + detalle, guest libre); resto → `AuthView`.
- Regla del guest: ver catálogo y detalle es libre. Todo lo que escriba
  (GPS, offline) exige `isAuthenticated` / `hasRole(['admin'])`.
