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
npm run lint   # verificación TypeScript
npm start      # expo start
```
