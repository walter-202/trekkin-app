# trekkin-app — Historias de Usuario (figura oficial del equipo)

Alcance real de este repo: **HU-01, HU-02 y HU-07 al 100%**. HU-03…HU-06 y HU-08…HU-10
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

## HU-03: Explorar y consultar una ruta — dueño: Chicho (scaffold)
- **Rol:** Visitante / Usuario registrado. **Como** usuario **quiero** consultar el catálogo
  de rutas públicas, buscar y ver el detalle **para** conocer el trayecto antes de realizarlo.
- Criterios:
  1. Catálogo de rutas públicas y aprobadas al ingresar.
  2. Buscar y filtrar rutas; el sistema muestra las coincidentes.
  3. Tarjeta resumen por ruta.
  4. Al seleccionar una ruta, el sistema verifica autenticación (`AuthContext` HU-02).
  5. Sin sesión → solicita iniciar sesión o registrarse; al completar, continúa al detalle.
  6. Detalle: descripción, inicio, final, métricas, características y puntos relevantes.
  7. Mapa interactivo con zoom y desplazamiento.
- Estado: `views/explore/ExploreView.tsx` genérica en blanco + guest (`isGuest`,
  solo memoria). Capacidad prevista: catálogo público; **detalle con gate de auth**.

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

## HU-10: Gestionar usuarios y roles — dueña: Larico (scaffold)
- **Rol:** Administrador. **Quiero** consultar usuarios, bloquear/desbloquear y asignar roles
  **para** controlar seguridad y permisos.
- Criterios: módulo “Gestión de usuarios” → lista → detalle → bloquear (cuenta bloqueada) →
  desbloquear (rehabilita) → asignar rol (`user` / `admin`) → confirma operación.

## Roadmap (scaffold, no implementado)

## Roadmap (scaffold, no implementado)

| ID | Historia | Dueño | Ruta futura | Estado |
|---|---|---|---|---|
| HU-03 | Explorar y consultar ruta | Chicho | `views/explore/` + `routeService` | scaffold + guest |
| HU-04 | Descarga offline | Cusi | `persistence/tileCacheDB` | scaffold |
| HU-05 | Compartir ruta publicada | Monje | modal en explore | scaffold |
| HU-06 | Realizar ruta (actividad GPS) | Tapia, Beymar | `views/activity/` + `activityService` | scaffold |
| HU-07 | Planificar nueva ruta (borrador) | Apaza | `views/record/` | ✅ 100% |
| HU-08 | Grabar ruta con GPS | Ramos, Cruz | `views/record/` + `expo-location` (lee plan local `ready_for_gps` de HU-07) | scaffold |
| HU-10 | Gestionar usuarios y roles | Larico | `views/profile/` RBAC admin | scaffold |

Verificación y estado (90% — HU-01/02/07):
```bash
npm run lint   # tsc --noEmit → 0 errores
npm test       # suite HU-01/02 (16 casos, incluye Firestore en vivo)
```
- Verificado: lint 0, suite 16/16, E2E backend 7/7 (registro, perfil, login, reglas),
  login en Expo Go + entrada a HU-07 (“Planificar nueva ruta”) OK.
- Falta para 100%: matriz Expo Go completa de UI/UX por el equipo + ronda de correcciones
  cruzadas (como la eliminación de HU-09). Nadie declara 100% sin eso (ver `/hu-checklist`).

## Servicios reutilizables HU-01/02 → HU-03… (para los devs)
- `useAuth()` (`infrastructure/auth/AuthContext.tsx`): `currentUser`, `isGuest`
  (solo memoria, nunca persiste), `isAuthenticated`, `continueAsGuest()`, `exitGuest()`,
  `hasRole([...])`, `isAdmin`, `login/register/logout`.
- Gate (`src/App.tsx`): con sesión → `HomeView`; guest → `ExploreView` genérica
  (en blanco); resto → `AuthView`. Detalle de ruta (HU-03 C5): con gate de auth.
- Todo lo que escriba (GPS, offline, publicar) exige `isAuthenticated`; lo admin exige
  `hasRole(['admin'])`. Sin HU-09: no hay guard de moderación.
