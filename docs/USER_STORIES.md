# trekkin-app — Historias de Usuario (Figura Oficial del Equipo)

> **Alcance del Repositorio:**
> - **✅ 100% Implementadas y Verificadas:** HU-01, HU-02, HU-03, HU-05, HU-07 y HU-10.
> - **📋 Roadmap con Scaffold y Criterios Claros:** HU-04, HU-06 y HU-08.
> - **🚫 HU-09 Eliminada Definitivamente:** El equipo resolvió prescindir del rol moderador. Roles vigentes en toda la plataforma: estrictamente `user` y `admin`.

---

## HU-01: Registrar Cuenta — ✅ 100% implementada

- **Rol:** Visitante (usuario nuevo no autenticado).
- **Narrativa:** **Como** usuario nuevo de la plataforma **quiero** registrar una cuenta con mis datos personales y de acceso **para** ingresar a las funcionalidades protegidas de la aplicación y gestionar mi perfil de senderista.
- **Criterios de Aceptación (DoD):**
  1. **Acceso al formulario:** Selección del modo "Registrarse" en [`AuthView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/auth/AuthView.tsx) o desde el botón de registro en el Drawer.
  2. **Campos obligatorios:** Nombre Completo, Correo Electrónico, Nombre de Usuario (alias), Contraseña, Confirmación de Contraseña y Checkbox de Aceptación de Normas de Seguridad en Montaña.
  3. **Validación Zod estricta (`RegisterSchema`):**
     - Correo con formato válido.
     - Contraseña con longitud mínima de 8 caracteres.
     - Coincidencia exacta entre contraseña y confirmación.
     - Normalización automática del alias (remueve `@` inicial y espacios).
     - Validación obligatoria de la casilla de términos de montaña.
  4. **Unicidad de cuenta:** Detección de correos ya registrados contra Firebase Auth (`auth/email-already-in-use`) con propagación de mensaje amigable en español.
  5. **Asignación automática de rol:** Todo usuario registrado se inicializa exclusivamente con el rol básico `user`, `summitsCount: 0` y `isBlocked: false`.
  6. **Confirmación y flujo post-registro:** Mensaje de éxito ("¡Cuenta creada exitosamente!") y redirección automática al formulario de inicio de sesión (`signOut` inmediato sin sesión automática espuria).
- **Mapeo Técnico:**
  - *Dominio:* [`src/core/domain/auth.schemas.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/auth.schemas.ts) (`RegisterSchema`, `UserProfileSchema`).
  - *Aplicación:* [`src/core/application/auth/RegisterUser.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/auth/RegisterUser.usecase.ts).
  - *Infraestructura:* [`src/infrastructure/database/userProfileService.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/database/userProfileService.ts), Firebase Authentication y Firestore (`users/{uid}`).
  - *Presentación:* [`src/presentation/views/auth/RegisterForm.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/auth/RegisterForm.tsx), [`AuthView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/auth/AuthView.tsx).

---

## HU-02: Iniciar y Cerrar Sesión — ✅ 100% implementada

- **Rol:** Usuario registrado / Administrador.
- **Narrativa:** **Como** usuario registrado **quiero** iniciar y cerrar sesión de forma segura con mis credenciales **para** acceder a mis funciones privadas, proteger mi información y resguardar mi identidad.
- **Criterios de Aceptación (DoD):**
  1. **Acceso:** Desde el modo "Iniciar Sesión" en [`AuthView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/auth/AuthView.tsx) o ante cualquier acción protegida que solicite autenticación.
  2. **Campos requeridos:** Correo electrónico y contraseña.
  3. **Seguridad visual:** Campo de contraseña con visibilidad protegida y botón de alternancia mostrar/ocultar contraseña (`Eye` / `EyeOff`).
  4. **Validación de credenciales:** Evaluación con `LoginSchema`. Si las credenciales son inválidas, se muestra error informativo y no se establece sesión.
  5. **Clasificación de fallos:** Discriminación técnica entre credenciales inválidas (error de autenticación) y fallas de conectividad de red (`isNetworkError`).
  6. **Bloqueo preventivo de cuentas suspendidas:** Si el perfil tiene `isBlocked === true`, el login es rechazado inmediatamente con error explicativo ("Tu cuenta se encuentra suspendida").
  7. **Sesión persistente y canónica:** Guardado seguro en AsyncStorage bajo la clave `trekkin_auth_user` (sin referencias a proyectos anteriores).
  8. **Identidad visible:** Avatar con inicial, nombre y badge de rol (`ADMINISTRADOR` o `SENDERISTA`) en Drawer y pantalla de inicio [`HomeView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/home/HomeView.tsx).
  9. **Cierre seguro:** Acción "Cerrar sesión" en [`HomeView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/home/HomeView.tsx) que ejecuta `signOut`, purga la sesión local de AsyncStorage y devuelve al estado visitante.
- **Mapeo Técnico:**
  - *Dominio:* `LoginSchema` en [`src/core/domain/auth.schemas.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/auth.schemas.ts).
  - *Aplicación:* [`LoginUser.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/auth/LoginUser.usecase.ts), [`LogoutUser.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/auth/LogoutUser.usecase.ts).
  - *Infraestructura:* [`AuthContext.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/auth/AuthContext.tsx), listener de cambios de estado de Firebase Auth.
  - *Presentación:* [`LoginForm.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/auth/LoginForm.tsx), [`HomeView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/home/HomeView.tsx).

---

## HU-03: Explorar y Consultar Rutas Públicas — ✅ 100% implementada

- **Rol:** Visitante / Senderista autenticado.
- **Narrativa:** **Como** senderista o visitante **quiero** explorar el catálogo de rutas públicas, buscar recorridos y consultar el detalle técnico completo con mapa interactivo **para** conocer las características técnicas (distancia, desnivel, tiempo, checkpoints) antes de realizar la excursión.
- **Criterios de Aceptación (DoD):**
  1. **Acceso libre sin fricción (Guest Libre):** Al abrir la app, la pantalla principal de entrada es el catálogo de rutas públicas [`ExploreView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/ExploreView.tsx). Tanto visitantes como usuarios logueados tienen acceso total a la consulta.
  2. **Filtrado y búsqueda reactiva:**
     - Búsqueda por texto (nombre de ruta, región o tramo).
     - Filtro por chips de dificultad: `Todas`, `Fácil`, `Moderado`, `Difícil`, `Experto`.
     - Validación Zod con `RouteFiltersSchema`.
  3. **Tarjeta resumen de ruta ([`RouteCard`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteCard.tsx)):**
     - Nombre de la ruta y tramo (inicio → final).
     - Distancia en km y duración estimada en horas.
     - Badge de dificultad y miniatura fotográfica (`route.photos[0]`) con fallback al icono de montaña.
  4. **Detalle completo de ruta ([`RouteDetailView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteDetailView.tsx)):**
     - Header con branding andino y botón de retorno al catálogo.
     - Badge flotante de desnivel sobre el mapa (`+XX m`).
     - Tarjeta horizontal de métricas divididas: Distancia, Desnivel, Tiempo (`Xh Ym`), Modalidad (`Solo` o `Acompañado`).
     - Tarjeta de detalle de itinerario y descripción técnica.
     - Listado de puntos de interés y checkpoints con categoría y notas.
  5. **Mapa 100% nativo interactivo ([`PlanMap`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/components/map/PlanMap.tsx)):**
     - Slippy Map propio implementado con primitivas puras de React Native (`View`, `Image`, `PanResponder`, `react-native-svg`), sin WebViews ni inyección de DOM HTML.
     - Trazado de ruta (`trail`) con polilínea SVG y marcadores (`pointsOfInterest`).
     - ~85 teselas pre-empaquetadas de La Paz en `assets/tflat/` que operan **100% offline** sin depender de servidores externos.
  6. **Gate flexible y amigable:**
     - Ver catálogo y ver detalle de cualquier ruta es **100% público**.
     - Al presionar acciones que exigen sesión (ej: "Iniciar sesión / Crear cuenta" o futuras de grabación GPS), se abre [`AuthView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/auth/AuthView.tsx) pudiendo cancelar para retornar a la ruta sin perder el contexto.
- **Mapeo Técnico:**
  - *Dominio:* [`route.schemas.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/route.schemas.ts) (`RouteSchema`, `RouteFiltersSchema`).
  - *Aplicación:* [`ListPublishedRoutes.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/explore/ListPublishedRoutes.usecase.ts), [`SearchRoutes.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/explore/SearchRoutes.usecase.ts), [`GetRouteDetail.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/explore/GetRouteDetail.usecase.ts).
  - *Infraestructura:* [`routeService.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/database/routeService.ts), [`routeSeed.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/database/routeSeed.ts), [`tileCache.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/persistence/tileCache.ts).
  - *Presentación:* [`ExploreView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/ExploreView.tsx), [`RouteCard.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteCard.tsx), [`RouteDetailView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteDetailView.tsx), [`Drawer.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/components/nav/Drawer.tsx).

---

## HU-04: Descargar Ruta Offline — 📋 Dueño: Wilfredo Cusi (Roadmap / Scaffold)

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** senderista que va a zonas sin cobertura **quiero** descargar la información técnica y teselas de mapa de una ruta **para** consultarla en campo sin conexión a internet.
- **Criterios de Aceptación (DoD para Cusi):**
  1. **Punto de activación:** Botón "Descargar ruta" en el panel de acciones de [`RouteDetailView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteDetailView.tsx).
  2. **Cálculo de almacenamiento:** El sistema calcula y muestra en un modal el peso aproximado de descarga (datos de ruta + checkpoints + teselas del bounding box del recorrido).
  3. **Descarga y guardado local:**
     - Almacenamiento en base de datos local / filesystem (`expo-file-system` o SQLite local).
     - Progreso de descarga visual (indicador porcentual).
  4. **Modo offline verificado:** Una vez completada la descarga, la ruta queda marcada con badge "Disponible offline" y puede consultarse en modo avión sin error de red.

---

## HU-05: Compartir Ruta Publicada — ✅ 100% implementada

- **Rol:** Senderista / Usuario de la plataforma.
- **Narrativa:** **Como** usuario de la aplicación **quiero** compartir una ruta pública mediante un enlace directo y redes sociales/mensajería **para** difundirla con amigos y compañeros de expedición.
- **Criterios de Aceptación (DoD):**
  1. **Acceso desde el detalle:** Botón de compartir en el panel de acciones de [`RouteDetailView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteDetailView.tsx).
  2. **Validación de publicación:** `ShareRouteUseCase` valida en dominio que `status === 'published'`. Rutas en borrador (`draft`) o rechazadas no pueden compartirse.
  3. **Enlace determinístico sin duplicación:** Construcción de URL canónica `trekkin-app://r/{routeId}` (o `exp://.../--/r/{routeId}`) basada en el `routeId` único de Firestore. No se duplican colecciones ni modelos de datos.
  4. **Modal de difusión ([`ShareModal`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/ShareModal.tsx)):**
     - Muestra el resumen de la ruta (título, región, distancia, tiempo, dificultad).
     - Caja con el enlace generado.
     - Botón "Copiar enlace": Copia al portapapeles con feedback visual ("Enlace copiado") vía `expo-clipboard`.
     - Botón "Compartir…": Abre el Share Sheet nativo del dispositivo (WhatsApp, Telegram, etc.) con mensaje compuesto y enlace.
  5. **Deep Linking reactivo:** Recepción y resolución automática de enlaces compartidos en [`App.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/App.tsx) (`Linking.addEventListener`), abriendo directamente el detalle de la ruta para cualquier usuario.
- **Mapeo Técnico:**
  - *Dominio:* [`src/core/domain/share.schemas.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/share.schemas.ts) (`SharePayloadSchema`, `SharedRouteLinkSchema`, `parseShareLink`).
  - *Aplicación:* [`ShareRoute.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/share/ShareRoute.usecase.ts), [`CopyShareLink.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/share/CopyShareLink.usecase.ts), [`PublishShareLink.usecase.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/share/PublishShareLink.usecase.ts).
  - *Infraestructura:* [`src/infrastructure/share/shareService.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/share/shareService.ts) (`expo-clipboard`, `expo-linking`, `Share.share`).
  - *Presentación:* [`ShareModal.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/ShareModal.tsx), [`RouteDetailView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/explore/RouteDetailView.tsx).

---

## HU-06: Realizar una Ruta Existente — 📋 Dueños: Tapia & Beymar (Roadmap / Scaffold)

- **Rol:** Senderista registrado.
- **Narrativa:** **Como** senderista en campo **quiero** seguir una ruta publicada registrando mi actividad en tiempo real **para** guiarme con el trazado oficial, chequear checkpoints y guardar mi historial de ascenso.
- **Criterios de Aceptación (DoD para Tapia y Beymar):**
  1. **Vista de preparación:** Desde el detalle de la ruta → botón "Iniciar recorrido" → verificación de señal GPS y distancia al punto inicial.
  2. **Modo guía activo:**
     - Visualización del trazado oficial superpuesto con la posición GPS en vivo del usuario.
     - Métricas en tiempo real: distancia recorrida, distancia restante, tiempo transcurrido y ritmo.
  3. **Checkpoints interactivos:** Registro o confirmación de paso por paradas clave (fuentes de agua, zonas de descanso, pasos técnicos).
  4. **Pausa y finalización:** Opciones de pausar, reanudar y finalizar actividad (guardando estado `completed` o `incomplete` en el historial personal).

---

## HU-07: Planificar Nueva Ruta (Borrador) — ✅ 100% implementada

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** explorador **quiero** trazar y planificar una nueva ruta estableciendo puntos provisionales en el mapa y guardándola como borrador **para** consolidar los datos técnicos antes de realizar la expedición.
- **Criterios de Aceptación (DoD):**
  1. **Creación de borrador:** Acceso desde "Planificar Ruta" en el Drawer o en [`HomeView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/home/HomeView.tsx).
  2. **Nombre provisional obligatorio:** Entrada obligatoria del nombre provisional antes del guardado.
  3. **Selección de puntos en mapa:** Taps en el mapa nativo [`PlanMap`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/components/map/PlanMap.tsx) para fijar punto inicial provisional (verde) y punto destino provisional (ámbar).
  4. **Persistencia dual (Nube y Local):**
     - Guardado en Firestore (`routes/{id}`) con estado estricto `status: 'draft'`.
     - Autosave local reactivo en AsyncStorage vía Zustand (`usePlanStore`) para no perder datos ante salidas de la app.
  5. **Edición y recuperación de borradores:** Listado de borradores en [`DraftsView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/record/DraftsView.tsx) y edición de metadatos en [`PlanEditorView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/record/PlanEditorView.tsx).
  6. **Confirmación de punto inicial real:** Captura de ubicación GPS del dispositivo (`expo-location`) para confirmar o ajustar el punto de partida real antes del handoff a grabación.
- **Mapeo Técnico:**
  - *Dominio:* [`src/core/domain/plan.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/plan.ts), `plan.schemas.ts`.
  - *Aplicación:* Casos de uso en [`src/core/application/plan/`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/plan/) (`SaveDraft`, `GetDraft`, `UpdatePlan`, `ConfirmStartPoint`, `MarkReadyForGps`).
  - *Infraestructura:* [`routeService.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/database/routeService.ts), [`usePlanStore.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/persistence/usePlanStore.ts).
  - *Presentación:* [`RecordView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/record/RecordView.tsx), [`CreateRouteView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/record/CreateRouteView.tsx), [`PlanEditorView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/record/PlanEditorView.tsx).

---

## HU-08: Grabar Ruta con GPS — 📋 Dueños: Ramos & Cruz (Roadmap / Scaffold)

- **Rol:** Senderista autenticado.
- **Narrativa:** **Como** montañista en ruta **quiero** registrar el trayecto mediante el sensor GPS del teléfono **para** medir la distancia real, registrar paradas y publicar una ruta auténtica en la plataforma.
- **Criterios de Aceptación (DoD para Ramos y Cruz):**
  1. **Permisos y precisión:** Solicitud transparente de permisos de geolocalización en primer plano (`expo-location`) con informe de precisión en metros.
  2. **Grabación de waypoints:** Muestreo periódico de coordenadas (latitud, longitud, altitud) generando el arreglo ordenado de waypoints.
  3. **Añadir paradas intermedias (checkpoints):** Botón flotante para registrar puntos de interés con categoría (agua, camping, peligro, vista panorámica) y notas.
  4. **Resumen de fin de ruta:** Al pulsar "Finalizar", cálculo de distancia total, tiempo transcurrido, desnivel acumulado y opción de enviar a revisión.

---

## HU-09: Moderación y Validación de Rutas — 🚫 ELIMINADA POR EL EQUIPO

> **Resolución Oficial:** El equipo de desarrollo eliminó formalmente el rol `moderator` y la historia de usuario HU-09.
> - **Razones técnicas y de negocio:** Simplificación del modelo de autorización (RBAC) y foco en el MVP.
> - **Roles del sistema vigentes:** Estrictamente `'user'` y `'admin'`.
> - **Reglas Firestore y TypeScript:** No existe el valor `'moderator'` en `UserRole`, `firestore.rules` ni en los esquemas de dominio.

---

## HU-10: Gestionar Usuarios y Roles — ✅ 100% implementada

- **Rol:** Administrador de la plataforma.
- **Narrativa:** **Como** administrador **quiero** listar los usuarios registrados, consultar su detalle, bloquear/desbloquear cuentas y cambiar roles con bitácora de auditoría **para** garantizar la seguridad de la plataforma y el control de accesos.
- **Criterios de Aceptación (DoD):**
  1. **Control de acceso estricto (RBAC):** La opción "Gestión Usuarios" en el Drawer solo se renderiza si `currentUser.role === 'admin'`. Acceso denegado a usuarios estándar.
  2. **Búsqueda y filtros reactivos (`UserFiltersSchema`):**
     - Búsqueda por texto (nombre, correo o alias).
     - Filtro por estado: `Todos`, `Activos`, `Bloqueados`.
     - Filtro por rol: `Todos`, `Usuarios`, `Administradores` (rechazo explícito de cualquier mención a moderador).
  3. **Detalle de usuario ([`UserDetailView`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/profile/UserDetailView.tsx)):** Visualización de UID, nombre completo, alias, correo, rol actual, estado de bloqueo y fecha de registro.
  4. **Bloqueo y desbloqueo seguro:**
     - Confirmación obligatoria vía [`ConfirmActionModal`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/profile/ConfirmActionModal.tsx).
     - `BlockUserUseCase` establece `isBlocked: true` y genera registro en `accountLogs`.
     - `UnblockUserUseCase` restituye `isBlocked: false` y rehabilita el acceso.
     - **Regla anti-autobloqueo:** Un administrador no puede bloquear su propia cuenta.
     - **Regla de idempotencia:** Bloquear una cuenta ya bloqueada lanza error controlado.
  5. **Asignación de roles:**
     - Cambio de rol únicamente entre `user` y `admin`.
     - **Regla anti-lockout:** Un administrador no puede degradar el rol de su propia cuenta.
     - Registro auditado en `accountLogs` con `previousRole` y `newRole`.
  6. **Bitácora de seguridad (`accountLogs`):** Toda acción administrativa (bloqueo, desbloqueo, cambio de rol) genera un documento inmutable en Firestore con actor, target, timestamp y detalle.
- **Mapeo Técnico:**
  - *Dominio:* [`userManagement.schemas.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/userManagement.schemas.ts), tipos `AccountLogEntry` y `AccountAction` en [`types.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/domain/types.ts).
  - *Aplicación:* Casos de uso en [`src/core/application/admin/`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/core/application/admin/) (`ListUsers`, `GetUserDetail`, `BlockUser`, `UnblockUser`, `AssignRole`).
  - *Infraestructura:* [`accountLogService.ts`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/infrastructure/database/accountLogService.ts), reglas de seguridad `isAdmin()` en `firestore.rules`.
  - *Presentación:* [`UserManagementView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/profile/UserManagementView.tsx), [`UserCard.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/profile/UserCard.tsx), [`UserDetailView.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/profile/UserDetailView.tsx), [`ConfirmActionModal.tsx`](file:///d:/TRABAJO/uni/INGSOFT/trekkin-app/src/presentation/views/profile/ConfirmActionModal.tsx).

---

## Matriz de Estado y Verificación Automatizada

| Historia | Módulo / Funcionalidad | Estado | Suite de Pruebas |
| :--- | :--- | :---: | :--- |
| **HU-01** | Registro de cuenta | ✅ 100% | `auth_hu1_hu2.test.ts` (casos de validación, duplicados y rol) |
| **HU-02** | Inicio y cierre de sesión | ✅ 100% | `auth_hu1_hu2.test.ts` (casos de login, bloqueo y storage) |
| **HU-03** | Explorar y consultar rutas | ✅ 100% | `ExploreView`, `RouteDetailView`, `PlanMap` offline |
| **HU-04** | Descarga offline | 📋 Scaffold | Pendiente de desarrollo (Cusi) |
| **HU-05** | Compartir ruta publicada | ✅ 100% | `share_hu5.test.ts` (11 casos de enlace, copia y sheet) |
| **HU-06** | Realizar ruta en vivo | 📋 Scaffold | Pendiente de desarrollo (Tapia, Beymar) |
| **HU-07** | Planificar nueva ruta | ✅ 100% | `usePlanStore` + persistencia dual |
| **HU-08** | Grabar ruta con GPS | 📋 Scaffold | Pendiente de desarrollo (Ramos, Cruz) |
| **HU-09** | Moderación de rutas | 🚫 Eliminada | N/A (rol moderador purgado) |
| **HU-10** | Gestión de usuarios y roles | ✅ 100% | `user_management_hu10.test.ts` (22 casos T1–T17) |

### Comando de Verificación Global:
```bash
npm test
```
> Ejecuta en serie las suites de aceptación de **HU-01/02**, **HU-10** y **HU-05**, validando un total de **49 pruebas automatizadas al 100%** de éxito sin dependencias mockeadas de runtime.
