# CLEAN_ARCH_RULES.md — Clean Architecture + Puertos + Screaming (trekkin-app)

> Híbrido pragmático: **Clean por dentro** (dominio puro + casos de uso con puertos) + **features por fuera**
> (UI colocalizada por capacidad). Alcance del repo: scaffold + HU-01/02. Migración incremental por feature.

## 1. Regla de dependencia (innegociable)

```
core/domain  ←  core/application  ←  infrastructure  ←  presentation
   (puro)          (usecases+puertos)     (adaptadores)      (UI + composición)
```

- `src/core/domain/`: TS + Zod puros (`types.ts`, `auth.schemas.ts`). Cero imports de
  `react-native`, `expo`, `firebase`, `window`.
- `src/core/application/<feature>/`: casos de uso puros (`RegisterUser`, `LoginUser`, `LogoutUser`)
  que orquestan **puertos inyectados** (`RegisterPorts`, `LoginPorts`). Nunca importan Firebase ni storage.
- `src/infrastructure/`: adaptadores que implementan los puertos (Firebase Auth, Firestore,
  AsyncStorage vía `storage.ts`). Firebase se inicializa SOLO en `firebase/config.ts`.
- `src/presentation/`: compone. Las vistas llaman a `AuthContext`, que adapta los puertos;
  nunca contienen reglas de negocio ni validación manual (Zod en `core/domain`).

## 2. Screaming + colocalización

La estructura grita el negocio (auth, home…), no la tecnología:

```
presentation/
├── theme.ts                          # ÚNICA fuente visual (tokens)
├── components/auth/                  # Compartido real (vía index.ts si crece)
└── views/auth|home|_template/        # Feature: lo de un solo uso vive AQUÍ
    ├── AuthView.tsx                  # Compositor (objetivo ~150 líneas)
    ├── LoginForm.tsx / RegisterForm.tsx   # Forms colocalizados (patrón a seguir)
    └── _template/ModuleTemplateView.tsx   # Base para HU-03…HU-10
```

- **Vista = compositor** (~150 líneas): layout, navegación, qué pieza mostrar.
- **Form de feature**: dueño de su estado, su validación (Zod) y su submit.
- **Regla de colocalización**: un uso → mismo archivo/carpeta; dos → vigilar; tres → subir a compartido (**Regla de Tres**).

## 2b. Nombres: prohibido el prefijo `Native*`

Un concepto = un nombre canónico (`AuthView`, `HomeView`). La plataforma se separa por
**carpeta**, no por nombre. Este repo ya nace limpio: mantenerlo así. Al portar código con
prefijo, renombrar al canónico (verificar con grep que no colisione).

## 3. Reutilizar antes de crear (anti-reinvención)

> El repo se actualiza constantemente (multi-dev): sincroniza (`git pull --ff-only`) y
> revisa cambios recientes que te favorezcan antes de diseñar. Reutilizar va antes que crear.

Antes de escribir un input, botón, banner o card:

1. Mira si ya existe en `presentation/` — ¿se puede reusar o extraer el común? Úsalo, no copies.
2. `grep` en `views/` por si otro feature ya lo resolvió.
3. ¿Patrón de composición? Carga `composition-patterns` y `expo-design-system` antes de diseñar la API.
4. Nueva primitiva solo por Regla de Tres o token del design system, con variantes explícitas
   y `accessibilityLabel`.

## 3b. Alcance: solo lo que pide la HU

Cada campo/botón visible debe trazarse a un criterio (`HU-0X Cn`). Nada fuera de criterios
se implementa sin preguntar antes (ver `AGENTS.md` → Alcance por HU). En review, campo sin
criterio = hallazgo major.

## 4. Estado, datos y auth

- Sesión persistente en AsyncStorage (`storage.ts`, clave `trekkin_auth_user`).
- `Gate` en `App.tsx`: sin sesión → `AuthView`; con sesión → `HomeView`. Las privadas futuras
  (HU-03…HU-10) cuelgan del Gate, nunca de chequeos sueltos en cada vista.
- RBAC vigente (`user|admin`, sin HU-09) en servicio + `firestore.rules`, no solo en UI.
- Fallbacks locales de auth SOLO ante error de red (`isNetworkError`); credencial inválida,
  duplicado o bloqueo siempre son error visible, nunca sesión silenciosa.

## 5. Cumplimiento

- `/hu-checklist HU-0X`: planificar → codificar (un agente) → validar con evidencia → cerrar.
- `@clean-arch-guardian` audita diffs contra este archivo (solo lectura).
- Tests: aún no hay suite; cada fix de dominio suma su caso Zod/puertos cuando se cree `src/tests/`.
