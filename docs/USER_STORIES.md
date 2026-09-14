# trekkin-app — Historias de Usuario (V1 scaffold)

Alcance real de este repo: **HU-01, HU-02 y HU-03 al 100%**. HU-04…HU-10 son roadmap
con scaffold (tipos + reglas Firestore + plantilla de vista), sin lógica.

## HU-01: Registrar Cuenta — ✅ 100% implementada

- **Como** visitante **quiero** registrar una cuenta **para** acceder a la plataforma.
- Criterios:
  1. Formulario “Registrarse” (`AuthView`, modo `register`).
  2. Campos: Nombre Completo, Correo, Usuario, Contraseña, Confirmar Contraseña,
     Aceptación de Normas de Seguridad en Montaña.
  3. Validación `RegisterSchema` (zod): email válido, pass ≥ 8, confirmación igual,
     términos aceptados, usuario único (Firebase Auth lanza error si el correo existe).
  4. Rol automático `user` (`RegisterUserUseCase`).
  5. Mensaje de confirmación (“¡Cuenta creada exitosamente!”).
  6. Redirección a login (HU-02).
- Archivos: `core/domain/auth.schemas.ts`, `core/application/auth/RegisterUser.usecase.ts`
  (sin `saveSession`: HU-01 C6 no crea sesión),
  `infrastructure/auth/AuthContext.tsx` (`register(args)` delega al usecase + `signOut`
  tras crear la cuenta; `isNetworkError`: fallbacks locales solo con error de red;
  duplicados, claves débiles y errores Zod se propagan),
  `infrastructure/database/userProfileService.ts`,
  `presentation/views/auth/AuthView.tsx` (compositor; éxito de registro → modo `login`
  con “¡Cuenta creada exitosamente! Ahora inicia sesión.”) +
  `presentation/views/auth/LoginForm.tsx` / `RegisterForm.tsx` (forms colocalizados con Zod;
  `RegisterForm` pasa los 6 campos al contexto) +
  primitivas `presentation/components/ui/` (`Field`, `Button`, `Banner`).
- Nota: `SEED_ADMIN_ACCOUNTS` / `switchDemoRole` / Google quedan aislados como demo
  fuera de criterios; el arranque es sin sesión (`currentUser = null`) y el Gate
  solo muestra `AuthView` hasta login real.

## HU-02: Iniciar y Cerrar Sesión — ✅ 100% implementada

- **Como** usuario registrado **quiero** iniciar/cerrar sesión **para** usar la plataforma.
- Criterios:
  1. Acceso desde `AuthView` (modo `login`) o trigger contextual.
  2. Correo + contraseña de HU-01.
  3. Contraseña oculta con toggle `Eye`/`EyeOff`.
  4. Validación `LoginSchema` + mensajes descriptivos.
  5. Credenciales válidas → sesión + redirección según rol (RBAC: `hasRole`, `isAdmin`, `isModerator`).
  6. Credenciales inválidas → error, sin sesión.
  7. Sesión persistente (`storage.ts`, clave `trekkin_auth_user`, AsyncStorage).
  8. Rutas privadas protegidas (`Gate` en `App.tsx`).
  9. Usuario activo visible (avatar, nombre verificado, badge de rol en `HomeView`).
  10. Cierre seguro (`LogoutUserUseCase` + botón Salir).
- Archivos: `core/application/auth/LoginUser.usecase.ts`, `LogoutUser.usecase.ts`,
  `AuthContext.tsx` (`login()` / `logout()` delegan a los usecases con puertos Firebase +
  `storage`; `isBlocked` bloquea sesión en login y en `onAuthStateChanged`; fallbacks
  solo por red; `logout()` vía `LogoutUserUseCase`, `onAuthStateChanged`,
  `subscribeToUserProfile`), `presentation/views/home/HomeView.tsx`,
  `presentation/views/auth/AuthView.tsx` (compositor) +
  `presentation/views/auth/LoginForm.tsx` (valida con `LoginSchema`).

## HU-03: Explorar y consultar ruta — ✅ 100% implementada

- **Como** usuario de la plataforma **quiero** consultar el catálogo de rutas públicas,
  buscar y visualizar el detalle completo de un recorrido **para** conocer las
  características técnicas del trayecto antes de realizarlo.
- Decisión de gate (guest libre): catálogo y detalle visibles sin sesión; GPS/offline/moderar
  exigen `isAuthenticated` / `hasRole` (el detalle muestra el banner de login, nunca bloquea
  la consulta).
- Criterios:
  1. Ingreso a la app → catálogo de rutas públicas y aprobadas (`status == 'published'`).
  2. Búsqueda por texto + filtro por dificultad (chips) validados con `RouteFiltersSchema` (Zod).
  3. Solo se muestran rutas que coinciden con los criterios (`SearchRoutesUseCase`).
  4. Tarjeta resumen por ruta (`RouteCard`: nombre, distancia, dificultad, tramo inicio→fin).
  5. Selección de ruta → detalle sin exigir sesión (guest libre).
  6. Detalle con descripción, inicio, final, métricas, características y puntos relevantes
     (`RouteDetailView` + `GetRouteDetailUseCase`, solo `published`).
  7. Mapa interactivo (`RouteMap`, `react-native-maps`) con zoom y desplazamiento habilitados;
     fallback estático en web.
- Archivos: `core/domain/route.schemas.ts` (`RouteSchema`, `RouteFiltersSchema`),
  `core/application/explore/` (`ListPublishedRoutes`, `SearchRoutes`, `GetRouteDetail` usecases
  puros con puertos), `infrastructure/database/routeService.ts` (query `routes`
  `where status == 'published'` + get por id) y `routeSeed.ts` (fallback demo solo ante
  red fallida o colección vacía), `presentation/views/explore/` (`ExploreView` catálogo,
  `RouteCard`, `RouteDetailView`, `RouteMap`), `src/App.tsx` (Gate: guest → ExploreView;
  con sesión → tabs Inicio/Explorar; HU-01/02 intactas).
- Nota nativa: `react-native-maps` es módulo nativo → requiere dev-build para el mapa
  interactivo (`npx expo-doctor` en verde); en Expo Go clásico el detalle funciona con
  la vista previa del trazado.

## Roadmap (scaffold, no implementado)

| ID    | Historia                                | Ruta futura                           | Estado   |
| ----- | --------------------------------------- | ------------------------------------- | -------- |
| HU-04 | Descarga offline                        | `persistence/tileCacheDB`             | scaffold |
| HU-05 | Compartir ruta publicada                | modal en explore                      | scaffold |
| HU-06 | Realizar ruta (actividad GPS)           | `views/activity/` + `activityService` | scaffold |
| HU-07 | Planificar nueva ruta (borrador)        | `views/record/` modo plan             | scaffold |
| HU-08 | Grabar ruta con GPS                     | `views/record/` + `expo-location`     | scaffold |
| HU-09 | Aprobar/rechazar ruta (moderador/admin) | `views/moderation/` RBAC              | scaffold |
| HU-10 | Gestionar usuarios y roles (admin)      | `views/profile/` RBAC                 | scaffold |

Verificación:

```bash
npm run lint   # tsc --noEmit
```

## Servicios reutilizables HU-01/02 → HU-04… (HU-03 ya implementada arriba)

- `useAuth()` (`infrastructure/auth/AuthContext.tsx`): `currentUser`, `isGuest`
  (solo memoria, nunca persiste), `isAuthenticated`, `continueAsGuest()`, `exitGuest()`,
  `hasRole([...])`, `isAdmin`, `isModerator`, `login/register/logout`.
- Gate (`src/App.tsx`): con sesión → tabs `HomeView` / `ExploreView`; guest → `ExploreView`
  (catálogo + detalle, guest libre); resto → `AuthView`.
- Regla del guest: ver catálogo y detalle es libre. Todo lo que escriba
  (GPS, offline, moderar) exige `isAuthenticated` / `hasRole`.
