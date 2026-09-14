# trekkin-app

Scaffold Expo SDK 57 con **Clean Architecture** — HU-01 (Registro) y HU-02 (Login/Logout)
funcionales al 100%. Resto de HUs como estructura guiada.

## Inicio rápido

```bash
npm install
npx expo start --lan        # Expo Go (misma WiFi) / http://localhost:8081 (web)
```

## Estructura

- `src/core/` — dominio puro + casos de uso (`auth.schemas.ts`, `application/auth/`)
- `src/infrastructure/` — Firebase, `AuthContext`, `userProfileService`, `storage`
- `src/presentation/` — `AuthView`, `HomeView`, `_template/`, `theme.ts`
- `docs/` — `ARCHITECTURE.md`, `MODULE_GUIDE.md`, `USER_STORIES.md`, `DESIGN_RULES.md`
- `firestore.rules` — seguridad `users/routes/activities/reviews`

## Crear un módulo nuevo

1. Lee `docs/MODULE_GUIDE.md`.
2. Copia `src/presentation/views/_template/` a `src/presentation/views/<modulo>/`.
3. Implementa en orden: dominio → schemas → use cases → servicio → vista → `App.tsx`.

## Comandos

```bash
npm install     # Instala dependencias del proyecto
npm test        # Ejecuta la suite de pruebas automatizadas HU-01 y HU-02 + verificación Firestore
npm run lint    # Verificación estricta de TypeScript (0 errores)
npm start       # Inicia Metro Bundler para Expo Go
```

## Configuración Firebase & Firestore

El proyecto se encuentra configurado con Firebase y Cloud Firestore (`ai-studio-trekkingbolivia-1ecbcee3-c0a9-40f1-afd9-79c9d37c0926`):
- `firebase-applet-config.json`: credenciales del proyecto preconfiguradas.
- `src/infrastructure/firebase/config.ts`: inicialización con persistencia nativa en `AsyncStorage`.
- `firestore.rules`: reglas de seguridad activas para la colección `users`, `routes`, `activities` y `reviews`.
- Ejecuta `npm test` para verificar la conectividad con Firestore y la validez de los casos de uso de autenticación.
