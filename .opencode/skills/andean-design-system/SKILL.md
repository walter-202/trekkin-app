---
name: andean-design-system
description: Andean visual system for trekkin-app native screens — AndeanTheme tokens, reuse-first rules, component recipes, and anti-slop guardrails
license: MIT
compatibility: opencode
metadata:
  audience: trekkin-app-team
  source: docs/DESIGN_RULES.md
---

# Andean Design System (nativo)

Fuente: `docs/DESIGN_RULES.md` + `src/presentation/theme.ts`. `AndeanTheme` es la ÚNICA fuente de verdad. Cero hex/espaciado/tipo hardcodeado fuera de `theme.ts`.

## Tokens

- **Fondos:** `background #051712`, `backgroundSecondary`, `card #0E2E24`, `cardElevado`, `overlay rgba(5,23,18,0.85)`.
- **Bordes:** `border #1A4537`, `borderLight`. 1px, sin sombras pesadas.
- **Acción:** CTA esmeralda profundo, acento vivo `primary #10B981` (En Vivo, activos), oro (logros), peligro `danger #EF4444` (SOS, salir).
- **Texto (dark-only):** `text #F9FAFB`, `textSecondary #9CA3AF`, `textMuted #6B7280`.
- **Tipo:** `System`; micro-labels de formulario 10px bold uppercase, siempre ARRIBA del campo.
- **Touch:** targets ≥ 44pt, `SafeAreaView` siempre.

## Reutilizar antes de crear (obligatorio)

1. ¿Ya existe en `presentation/`? Úsalo.
2. Si no: `grep` en `views/` por si otro feature ya lo resolvió → extrae el común, no copies.
3. Nueva primitiva solo por Regla de Tres o token del sistema, con variantes explícitas
   (`tone: 'error' | 'success'`, nunca booleanos encadenados) y `accessibilityLabel`.
4. Lo de un solo uso se queda colocalizado en `views/<feature>/` (ver `CLEAN_ARCH_RULES.md`).
5. Prohibido el prefijo `Native*` en archivos nuevos; prohibido `div`/`button`/`className` en nativo.

## Recetas

- **Inputs:** icono `lucide-react-native` a la izquierda, toggle contextual a la derecha (ojo en password), foco en verde andino.
- **CTA principal:** esmeralda, texto blanco, altura ≥ 48, estado loading con spinner (no doble submit).
- **Banners:** error rojo translúcido / éxito verde translúcido (no pantallas en blanco ante fallos).

## Controles nativos

Sheets, pickers, sliders, toggles, menús → `@expo/ui` (SwiftUI/Compose real). Listas de datos → `FlatList` (`@expo/ui` List NO virtualiza).

## Skills externas de componentización (no reinventar)

```bash
npx skills add vercel-labs/agent-skills --skill composition-patterns
npx skills add vercel-labs/agent-skills --skill react-native-skills
```

| Skill | Cuándo cargarla |
|---|---|
| `expo-design-system` (de `npx skills add expo/skills`) | Tokens/theme, librería de componentes, auditar drift |
| `vercel-composition-patterns` | APIs de componentes: compound components, evitar boolean props, variantes explícitas |
| `react-native-skills` (reglas `design-system-compound-components`, `ui-*`) | `Pressable` sobre `TouchableOpacity`, `expo-image`, safe-area, modales nativos |
| `expo-native-ui` | Que la pantalla se sienta nativa (HIG, controles) |

## Anti-slop (falla review)

Gradientes morado-azul, placeholders "lorem", un solo hue, sombras pesadas, `className`/`div` en nativo, prefijo `Native*`, hex fuera de `theme.ts`, repetir un estilo 3× sin extraerlo.
