# trekkin-app — Historias de Usuario (V1 scaffold)

Alcance real de este repo: **HU-01 y HU-02 al 100%**. HU-03…HU-10 son roadmap
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
- Archivos: `core/domain/auth.schemas.ts`, `core/application/auth/RegisterUser.usecase.ts`,
  `infrastructure/auth/AuthContext.tsx` (`register()`),
  `infrastructure/database/userProfileService.ts`, `presentation/views/auth/AuthView.tsx`.

## HU-02: Iniciar y Cerrar Sesión — ✅ 100% implementada
- **Como** usuario registrado **quiero** iniciar/cerrar sesión **para** usar la plataforma.
- Criterios:
  1. Acceso desde `AuthView` (modo `login`) o trigger contextual.
  2. Correo + contraseña de HU-01.
  3. Contraseña oculta con toggle `Eye`/`EyeOff`.
  4. Validación `LoginSchema` + mensajes descriptivos.
  5. Credenciales válidas → sesión + redirección según rol (RBAC: `hasRole`, `isAdmin`, `isModerator`).
  6. Credenciales inválidas → error, sin sesión.
  7. Sesión persistente (`storage.ts`, clave `trekking_auth_user`, AsyncStorage).
  8. Rutas privadas protegidas (`Gate` en `App.tsx`).
  9. Usuario activo visible (avatar, nombre verificado, badge de rol en `HomeView`).
  10. Cierre seguro (`LogoutUserUseCase` + botón Salir).
- Archivos: `core/application/auth/LoginUser.usecase.ts`, `LogoutUser.usecase.ts`,
  `AuthContext.tsx` (`login()`, `logout()`, `onAuthStateChanged`,
  `subscribeToUserProfile`), `presentation/views/home/HomeView.tsx`.

## Roadmap (scaffold, no implementado)

| ID | Historia | Ruta futura | Estado |
|---|---|---|---|
| HU-03 | Explorar y consultar ruta | `views/explore/` + `routeService` | scaffold |
| HU-04 | Descarga offline | `persistence/tileCacheDB` | scaffold |
| HU-05 | Compartir ruta publicada | modal en explore | scaffold |
| HU-06 | Realizar ruta (actividad GPS) | `views/activity/` + `activityService` | scaffold |
| HU-07 | Planificar nueva ruta (borrador) | `views/record/` modo plan | scaffold |
| HU-08 | Grabar ruta con GPS | `views/record/` + `expo-location` | scaffold |
| HU-09 | Aprobar/rechazar ruta (moderador/admin) | `views/moderation/` RBAC | scaffold |
| HU-10 | Gestionar usuarios y roles (admin) | `views/profile/` RBAC | scaffold |

Verificación:
```bash
npm run lint   # tsc --noEmit
```
