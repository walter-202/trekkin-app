---
name: expo-sdk57-guide
description: Expo SDK 57 workflow for trekkin-app — managed workflow, Gate, permissions, EAS OTA vs rebuild, and which official expo and eas skill to load next
license: MIT
compatibility: opencode
metadata:
  audience: trekkin-app-team
  stack: expo-57-rn-0.86
---

# Expo SDK 57 Guide (trekkin-app)

Repo: `expo@57.0.22` · `react-native@0.86.3` · `react@19.2.3` · New Architecture. Managed workflow — NO eject.

## Reglas compartidas (siempre aplican)

- Nativo solo vía Expo Modules API o config plugins. Nada de `react-native link`.
- Cambio en `app.json` / deps nativas / permisos → correr `npx expo-doctor` y declarar **OTA vs rebuild**: `eas-update` = solo JS/assets; cambio nativo/permiso/versión SDK = rebuild + submit.
- Ante la duda, probar primero en Expo Go antes de `expo run:ios/android` o `eas build`.
- Rutas privadas (HU-03…HU-10) cuelgan del `Gate` en `App.tsx`; la UI nunca habla con Firebase directo (puertos en `core/application`).

## Adaptadores de este repo

| Necesidad | Solución correcta |
|---|---|
| Sesión persistente | AsyncStorage vía `src/infrastructure/persistence/storage.ts` |
| `localStorage` / `window` / `document` | prohibidos en nativo; usar APIs Expo/RN |
| Google login | `expo-auth-session` o `@react-native-google-signin` (`signInWithPopup` es web) |
| Mapas/tiles offline (roadmap) | `expo-file-system` + `expo-sqlite`, estimar MB y confirmar antes de descargar |
| GPS (roadmap HU-08) | `expo-location`, pedir solo en contexto con explicación |

## Router de skills oficiales (instalar 1 vez por máquina)

```bash
npx skills add expo/skills
```

Cargar bajo demanda DESPUÉS de esta skill, según la tarea:

| Tarea | Skill oficial |
|---|---|
| Duda general / setup | `expo-overview` (primero, es el router) |
| Tabs, stacks, modales, deep links | `expo-router` |
| Pantalla que se vea nativa | `expo-native-ui` |
| Theme/tokens, librería de componentes, drift | `expo-design-system` |
| Animación, gesto, sheet, háptico | `expo-animation` |
| Fetch/API, caché, offline, loaders | `expo-data-fetching` |
| Subir a TestFlight / Play | `eas-app-stores` |
| OTA JS/assets | `eas-update` (+ `eas-update-insights` salud del rollout) |
| CI/CD | `eas-workflows` |
| Subir SDK / deps rotas | `expo-upgrade` |

Fuente de verdad: docs Expo + Expo CLI + EAS CLI. Si una skill oficial contradice este repo (archivos, RBAC, AndeanTheme), gana el repo.
