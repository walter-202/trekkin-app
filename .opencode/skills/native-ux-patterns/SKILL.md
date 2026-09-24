---
name: native-ux-patterns
description: Mobile UX for trekkin-app — state matrix, auth flows, Gate protection, touch targets, accessibility, and RN performance rules
license: MIT
compatibility: opencode
metadata:
  audience: trekkin-app-team
  areas: auth-gate-a11y-performance
---

# Native UX Patterns (trekkin-app)

## 1. Matriz de estados (toda pantalla/flujo la implementa)

| Estado | Patrón |
|---|---|
| Loading | skeleton o spinner + texto ("Conectando con el campamento base…"), sin pantalla en blanco |
| Empty | icono + titular + CTA con siguiente acción |
| Error | qué pasó + reintentar (nunca tragar el error en silencio) |
| Offline | banner persistente + mensaje claro de reintento |

Copy en español claro, con siguiente acción.

## 2. Auth y Gate (HU-01/02)

- Registro: 6 datos (C2) → validación Zod → rol `user` → mensaje éxito → **redirect a login (C6)**.
- Login: email + clave oculta con toggle → error descriptivo sin sesión si falla.
- `Gate` en `App.tsx`: sin sesión solo existe `AuthView`. Fallbacks `anonymous` y sesiones
  silenciosas ante credencial inválida están prohibidos (`isNetworkError` solo para red).
- Sesión visible: avatar + nombre + badge de rol; logout limpia todo y vuelve al Gate.

## 3. Touch + accesibilidad

Targets ≥ 44pt, `SafeAreaView` siempre, dark-mode only. `accessibilityLabel` + `accessibilityRole`
en toda acción; contraste AA sobre `#0F1412`; Dynamic Type sin truncar.

## 4. Performance RN (aplica siempre)

- Listas: `FlatList` con `keyExtractor` (+ `getItemLayout`/`windowSize` si crecen); jamás `.map()` masivo en `ScrollView`.
- Imágenes: `expo-image` con caché; `memo`/`useCallback` en rows.
- Animación: Reanimated en UI thread; hápticos con `expo-haptics`.
- Rutas futuras (HU-03…): code-split por vista cuando el módulo pese.
