# trekkin-app — Historias de Usuario (V1 scaffold)

Alcance real de este repo: **HU-01, HU-02 y HU-07 al 100%**. HU-03…HU-06, HU-08 y HU-10
son roadmap con scaffold (tipos + reglas Firestore + plantilla de vista), sin lógica.

**HU-09 eliminada por el equipo: no existe el rol moderador** (roles vigentes: `user`, `admin`).

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
  5. Credenciales válidas → sesión + redirección según rol (RBAC: `hasRole`, `isAdmin`).
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

## HU-07: Planificar una nueva ruta — ✅ 100% implementada
- **Como** usuario autenticado **quiero** guardar una ruta como borrador **para**
  continuar planificando después y confirmar el punto inicial real.
- Criterios:
  1. “Crear nueva ruta” desde el hub (`HomeView` → `RecordView`).
  2. Mapa interactivo (`@maplibre/maplibre-react-native` + tiles OpenStreetMap, componente único `PlanMap`).
  3. Punto inicial provisional + destino provisional (taps en el mapa, `PlanPointPicker`).
  4. Guardar como borrador (`SaveDraftUseCase` → `routes/{id}` con `status:'draft'`).
  5. Autosave local (`usePlanStore` + AsyncStorage `trekking_plan_autosave`) → no se pierde al salir.
  6. Recuperar borrador (`DraftsView` + `GetDraftUseCase`).
  7. Modificar antes de iniciar (`PlanEditorView` + `UpdatePlanUseCase`).
  8. Confirmar/modificar punto inicial real con ubicación actual (`expo-location`,
     `StartPointConfirmView` + `ConfirmStartPointUseCase`).
  9. El sistema actualiza el punto inicial confirmado (`startPointConfirmed` local + `startPoint` en Firestore).
  10. Ruta lista para grabación GPS (`MarkReadyForGpsUseCase` → `status:'ready_for_gps'`,
      handoff a HU-08, `ReadyForGpsView`).
- Arquitectura: `core/domain/plan.ts` + `plan.schemas.ts` (zod), 8 use cases en
  `core/application/plan/` (puertos inyectados, sin Firebase/RN), `routeService.ts`
  (única capa que importa `firebase/firestore`), `usePlanStore.ts` (zustand + autosave),
  vistas delgadas en `presentation/views/record/`. La vista no importa `firebase/*`.
- Seguridad: `firestore.rules` ya cubre crear/actualizar borradores del creador
  (`status:'draft'`); `startPointConfirmed` se conserva localmente (no es key permitida).
- Feedback del equipo aplicado: el **nombre provisional de la ruta** es obligatorio y se rellena
  al crear (`CreateRouteView`, campo “NOMBRE PROVISIONAL DE LA RUTA *”, arriba de punto inicial y
  destino); sin nombre no se guarda el borrador. Misma etiqueta en el editor (`PlanEditorView`).
- Mapa **100% nativo, sin Google** (`@maplibre/maplibre-react-native`, `PlanMap.tsx`): tiles
  OpenStreetMap (raster source), tap reporta coordenadas y marcadores para inicio provisional,
  destino y ubicación actual. Sin WebView ni capa de HTML/DOM (regla nativa de AGENTS.md).
- **Offline**: MapLibre cachea los tiles ya vistos (caché ambiente, `setTileCountLimit`), de modo
  que el mapa sigue funcionando sin internet en las zonas navegadas previamente. La descarga
  explícita de regiones queda en HU-04 (roadmap).
- **Dev builds**: Expo Go ya no incluye ningún mapa nativo (ni Google Maps ni MapLibre,
  `expo/expo#49323`); el mapa se prueba con build de desarrollo (`npx expo run:android` /
  `npx expo run:ios` o `eas build`) en Android e iOS.
- Dependencias nuevas: `@maplibre/maplibre-react-native` (mapa nativo, config plugin en `app.json`)
  + `expo-location` (T8). Se retiraron `react-native-maps` y `react-native-webview`.
- Verificación: `npm run lint` (0 errores) y flujo T11–T20 con dev build (Android o iOS).

## Roadmap (scaffold, no implementado)

| ID | Historia | Ruta futura | Estado |
|---|---|---|---|
| HU-03 | Explorar y consultar ruta | `views/explore/ExploreView.tsx` (genérica en blanco) + `routeService` | scaffold + guest (criterios los define el otro dev) |
| HU-04 | Descarga offline | `persistence/tileCacheDB` | scaffold |
| HU-05 | Compartir ruta publicada | modal en explore | scaffold |
| HU-06 | Realizar ruta (actividad GPS) | `views/activity/` + `activityService` | scaffold |
| HU-08 | Grabar ruta con GPS | `views/record/` + `expo-location` (lee `ready_for_gps` de HU-07) | scaffold |
| HU-10 | Gestionar usuarios y roles (admin) | `views/profile/` RBAC | scaffold |

Verificación:
```bash
npm run lint   # tsc --noEmit
```

## Servicios reutilizables HU-01/02 → HU-03… (para el otro dev, sin avanzar su HU)
- `useAuth()` (`infrastructure/auth/AuthContext.tsx`): `currentUser`, `isGuest`
  (solo memoria, nunca persiste), `isAuthenticated`, `continueAsGuest()`, `exitGuest()`,
  `hasRole([...])`, `isAdmin`, `login/register/logout`.
- Gate (`src/App.tsx`): con sesión → `HomeView`; guest → `ExploreView` genérica
  (`views/explore/`, en blanco, ya distingue invitado/autenticado/rol); resto → `AuthView`.
- Capacidad prevista del guest (pendiente de sus criterios): ver catálogo y detalle.
  Todo lo que escriba (GPS, offline, moderar) exige `isAuthenticated` / `hasRole`.
