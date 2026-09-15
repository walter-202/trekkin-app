# trekkin-app — Base de datos no relacional (Firestore + Auth)

Fuente de verdad triple: `src/core/domain/types.ts` (tipos) + `firestore.rules`
(validación exigible) + este doc (contrato legible para el informe).
**Regla anti-duplicación:** todo campo nuevo se agrega en los tres a la vez
(tipo → regla → esta tabla). Nada de campos “solo en código” ni “solo en consola”.

- Proyecto: `gen-lang-client-0923763848` · DB: `ai-studio-trekkingbolivia-1ecbcee3-…`
  (nombrada; no es `(default)`). Reglas e índices se despliegan con
  `firebase deploy --only firestore` (ver `firebase.json`).
- Clave de sesión local (NO es colección): `trekkin_auth_user` en AsyncStorage.

## Diagrama (colecciones y referencias)

```
users 1 ─── * routes      (routes.creatorId → users.uid)
users 1 ─── * activities  (activities.userId → users.uid)
routes 1 ── * activities  (activities.routeId → routes.id)
routes 1 ── * reviews     (reviews.routeId → routes.id, solo admin)
```

## Firebase Auth (gestionado por Firebase, no es colección)

| Campo | Tipo | Nota |
|---|---|---|
| `uid` | string | PK. Se copia a `users/{uid}` (mismo id de documento). |
| `email` | string | Único. Login HU-01/02. |
| contraseña | hash | Solo Firebase la conoce; nunca se guarda en Firestore. |
| `emailVerified`, proveedores, metadata | — | Gestionados por Firebase. |

## `users/{uid}` — perfiles (HU-01/02/10)

Roles vigentes: `user`, `admin` (sin HU-09; `moderator` eliminado).

| Campo | Tipo | Requerido | Límite/nota |
|---|---|---|---|
| `uid` | string | ✅ | = id del doc y `auth.uid`. |
| `email` | string | ✅ | ≤ 200. |
| `displayName` | string | ✅ | 1–150 (nombre completo HU-01). |
| `role` | enum | ✅ | `user` \| `admin`. Crear con `admin` solo si ya eres admin. |
| `isBlocked` | boolean | ✅ | `false` al crear. Bloquea login (HU-02/HU-10). |
| `createdAt` | number | ✅ | Timestamp ms. |
| `username` | string | — | ≤ 80, sin `@` (se normaliza en dominio). |
| `avatarUrl` | string | — | ≤ 500. |
| `summitsCount` | number | — | ≥ 0 (default 0). |
| `gpsAccuracy` | string | — | ≤ 80 (ej. `±2.4m Preciso`). |

Reglas: crear = dueño (`auth.uid == userId`) + válido + rol `user` (o admin) + `isBlocked:false`.
Actualizar dueño: solo `displayName, username, avatarUrl, summitsCount, gpsAccuracy`
(rol/bloqueo solo admin). Borrar: solo admin.

## `routes/{routeId}` — rutas (HU-03…HU-08)

| Campo | Tipo | Requerido | Límite/nota |
|---|---|---|---|
| `id` | string | ✅ | = id del doc, `^[a-zA-Z0-9_-]+$` ≤ 128. |
| `title` | string | ✅ | 1–200. |
| `difficulty` | enum | ✅ | `facil` \| `moderado` \| `dificil` \| `experto`. |
| `status` | enum | ✅ | `draft` \| `in_review` \| `published` \| `rejected`. Crear: solo `draft`/`in_review`. |
| `creatorId` | string | ✅ | = `auth.uid` del creador, inmutable. |
| `distanceKm` | number | ✅ | ≥ 0. |
| `description` | string | — | ≤ 5000. |
| `region` | string | — | ≤ 150. |
| `startPoint` / `endPoint` | map | — | `{name, lat, lng}`. |
| `durationMinutes` | number | — | ≥ 0. |
| `elevationGainM` | number | — | Solo código (no validado en reglas). |
| `modality` | enum | — | `solo` \| `acompañado`. |
| `isPrivate` | boolean | — | |
| `creatorName` | string | — | ≤ 150 (desnormalizado para catálogo). |
| `waypoints` | list | — | ≤ 5000 `{lat, lng, altitude?, timestamp?}`. |
| `checkpoints` | list | — | ≤ 100 (ver subtabla). |
| `photos` | list | — | ≤ 50 URLs. |
| `moderationNotes` | string | — | ≤ 2000 (notas de revisión del admin). |
| `reviewedBy` / `reviewedAt` | string / number | — | ≤ 150 / timestamp ms. |
| `createdAt` / `updatedAt` | number | — | Timestamps ms. |
| `isOfflineCached` / `estimatedOfflineSizeMB` | bool / number | — | Solo código (HU-04). |

Checkpoint: `{id, name, category, lat, lng, notes?, photoUrl?, createdAt}`.
`category`: `agua` \| `camping` \| `peligro` \| `vista` \| `descanso` \| `flora_fauna` \| `refugio`.

Reglas: leer lista/detalle = publicado, o dueño/admin. Crear = dueño + válido + `draft`/`in_review`.
Actualizar = dueño (mismos `id`/`creatorId`, keys permitidas) o admin. Borrar = dueño en `draft` o admin.
Índice compuesto desplegado: `creatorId ASC + status ASC + updatedAt DESC` (ver `firestore.indexes.json`;
lo usa `DraftsView`).

## `activities/{activityId}` — historial GPS (HU-06)

| Campo | Tipo | Requerido | Límite/nota |
|---|---|---|---|
| `id` | string | ✅ | = id del doc ≤ 128. |
| `userId` | string | ✅ | = `auth.uid`, inmutable. |
| `userName` | string | — | Desnormalizado. |
| `routeId` / `routeTitle` | string | ✅ / — | `routeId` ≤ 128. |
| `status` | enum | ✅ | `in_progress` \| `paused` \| `completed` \| `incomplete`. |
| `startedAt` / `finishedAt` | number | — | Requerido en tipo TS; reglas no lo exigen. |
| `distanceCoveredKm` | number | ✅ | ≥ 0. |
| `remainingDistanceKm` / `durationSeconds` | number | — | |
| `recordedPoints` | list | — | `{lat, lng, altitude?, timestamp?}`. |
| `completedCheckpoints` | list | — | Ids de checkpoints. |
| `isSynced` | boolean | — | |
| `createdAt` | number | — | |

Reglas: todo exige dueño (`userId == auth.uid`); borrar = dueño o admin.

## `reviews/{reviewId}` — auditoría admin (sin HU-09: solo admin)

| Campo | Tipo | Requerido | Nota |
|---|---|---|---|
| `id` | string | ✅ | = id del doc ≤ 128. |
| `routeId` | string | ✅ | ≤ 128. |
| `reviewerId` | string | ✅ | = `auth.uid` del admin que revisa. |
| `status` | enum | ✅ | `approved` \| `rejected`. |
| `observations` | string | — | ≤ 2000. |
| `reviewedAt` | number | — | Timestamp ms. |

Reglas: leer = con sesión; crear/actualizar = admin; borrar = admin.
