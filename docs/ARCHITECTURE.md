# trekkin-app — Arquitectura (Clean Architecture + Expo SDK 57)

Scaffold **HU-01 / HU-02** más módulos vivos (explorar, plan, actividad, admin).
Mapas: un solo `<TrekMap />` (MapLibre GL). Detalle en `docs/plan/plan_mapas_on_offline.md`.

## 1. Capas y regla de dependencias

```
src/
  core/                    ← DOMINIO + APLICACIÓN (puro, sin Firebase/React)
    domain/
      types.ts             ← entidades (UserProfile, UserRole, RouteModel…)
      auth.schemas.ts      ← validaciones zod HU-01/HU-02 (fuente de verdad)
    application/
      auth/
        RegisterUser.usecase.ts
        LoginUser.usecase.ts
        LogoutUser.usecase.ts
  infrastructure/          ← ADAPTADORES (único lugar con Firebase/AsyncStorage)
    firebase/config.ts     ← init Firebase (Auth + Firestore)
    auth/AuthContext.tsx   ← adapter: ejecuta los use cases + sesión en vivo
    database/
      userProfileService.ts   ← CRUD `users` (HU-01/HU-02)
      firestoreErrors.ts
    persistence/storage.ts ← AsyncStorage + caché en memoria (sesión persistente)
  presentation/            ← UI (React Native, sin `firebase/*` directo)
    theme.ts               ← AndeanTheme (colores/espaciados)
    components/auth/AuthModal.tsx
    views/auth/AuthView.tsx   ← formulario HU-01/HU-02 (DESIGN_RULES §3.A)
    views/home/HomeView.tsx   ← post-login: perfil + rol + logout + roadmap
    views/_template/ModuleTemplateView.tsx ← plantilla de módulo nuevo
```

**Regla de oro:** las dependencias apuntan hacia adentro.

- `presentation` → `infrastructure` (hooks) → `core/application` → `core/domain`.
- **Prohibido:** importar `firebase/*` en `presentation` o en `core`.
- **Prohibido:** importar `react-native` en `core`.

## 2. Flujos implementados

### HU-01 Registrar Cuenta

`AuthView` → `RegisterForm` (Zod) → `AuthContext.register(args)` → `RegisterUserUseCase(args, ports)`
→ valida `RegisterSchema` → `createUserWithEmailAndPassword` → `userProfileService.createUserProfile({role:'user'})`
→ `signOut` (sin auto-sesión) → mensaje de éxito → `AuthView` cambia a modo login (HU-02).

### HU-02 Login / Logout

`AuthView` → `LoginForm` (Zod) → `AuthContext.login()` → `LoginUserUseCase` → valida `LoginSchema`
→ `signInWithEmailAndPassword` → `getUserProfile(uid)` (sincroniza **rol RBAC** desde Firestore,
bloquea si `isBlocked`) → guarda sesión → `HomeView` muestra avatar, nombre, badge de rol y botón **Salir**
(`AuthContext.logout()` → `LogoutUserUseCase`).
`onAuthStateChanged` + `subscribeToUserProfile` mantienen la sesión en vivo.
Sin sesión, las rutas privadas no se renderizan (Gate en `App.tsx`).

### Guest (HU-03 ✅ implementada, guest libre)

`AuthView` (“Explorar como invitado”) → `continueAsGuest()` (solo memoria, sin sesión)
→ Gate muestra `ExploreView` (catálogo + detalle, `views/explore/`), que lee `isGuest` /
`isAuthenticated` / `hasRole`. `exitGuest()` vuelve a `AuthView`. HU-01/02 intactas.

## 3. Dónde va cada HU

| HU | Vista | Servicio | Dominio |
|---|---|---|---|
| HU-03 Explorar rutas | `views/explore/` + `components/map/TrekMap` | `database/routeService.ts` + `map/mapStyle.ts` | `domain/route.schemas.ts`, `geoBounds.ts` |
| HU-04 Offline | `views/downloads/` | `persistence/tileCacheDB.ts` + `mapPackFormats.ts` (manifiesto binario GPX + PMTiles, reemplazo atómico) | `domain/offline.ts`, `mapPackFormats.ts` |
| HU-05 Compartir | modal en explore | `share/shareService.ts` | `share.schemas.ts` |
| HU-06 Actividad GPS | `views/activity/` + `TrekMap` | `activityService.ts`, `locationService.ts` | `activity.schemas.ts` |
| HU-07/08 Planificar + Grabar | `views/record/` + `TrekMap` | `expo-location` + routeService | `plan.ts`, `calculations.ts`, `trackFormats.ts` |
| HU-10 Usuarios y roles | `views/profile/` + `hasRole(['admin'])` | `userProfileService` | `UserRole` |

(Sin HU-09: eliminada por el equipo; no hay vista de moderación ni rol moderador.)

### Offline y GPS: límites verificados (T9)

- No existe caché raster por tesela: se retiraron `tileCache.ts`, `offlineMaps.ts`, `tileRegistry.ts`, `PlanMap.tsx` y los PNG preempaquetados. Ningún flujo persiste ni descarga data-URIs PNG.
- La ruta canónica de mapa es `TrekMap`. Las descargas usan `tileCacheDB` únicamente como nombre histórico del repositorio binario: guarda archivos GPX/PMTiles y un manifiesto v2 en AsyncStorage; no guarda puntos ni bytes binarios en Firestore.
- El task de background GPS está configurado con Expo Location/Task Manager y delega al almacenamiento SQLite serializado. La ejecución real con pantalla apagada, app terminada y endurance aún requiere Android/iOS físico.
- La evidencia actual es de suites puras, lint y Expo Doctor. Firebase Emulator, Expo Go UI, renderer PMTiles en frío/modo avión, share sheet nativo y revisión UI completa siguen pendientes; por eso HU-04…HU-08 no se declaran al 100%.

`firestore.rules` ya incluye las reglas de `users/routes/activities/reviews` para no
reescribir seguridad cuando se implemente cada módulo.

## 4. Convenciones

- Nombres: `XxxView.tsx` (vistas), `XxxModal.tsx` (modales), `xxxService.ts`,
  `Xxx.usecase.ts`, `xxx.schemas.ts`, `useXxxStore.ts`.
- Estilos: `StyleSheet` + `AndeanTheme`; respetar `docs/DESIGN_RULES.md`.
- Validación siempre con **zod en dominio**, nunca solo en el formulario.
- Campos nuevos: tipo (`core/domain`) → regla (`firestore.rules`) → tabla (`docs/DATABASE.md`).
  Sin excepciones (anti-duplicación).
- Errores de Firestore centralizados en `firestoreErrors.ts`.
- Sesión bajo la clave `trekkin_auth_user`.
