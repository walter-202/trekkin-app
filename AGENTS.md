# AGENTS.md — Trekkin App (Expo SDK 57 + React Native)

> Instrucciones canónicas para agentes OpenCode. Alcance del repo: **scaffold + HU-01 y HU-02**.
> Stack: `expo@57.0.22` · `react-native@0.86.3` · `react@19.2.3` · TypeScript strict · Zustand + AsyncStorage · Firebase/Firestore · Zod · `expo-location` (roadmap HU-08).

## Comandos (usar en este orden)

```bash
npm start          # Metro Bundler interactivo
npm run android    # Android (emulador / dispositivo)
npm run ios        # iOS (solo macOS)
npm run web        # Web (Metro)
npm run lint       # tsc --noEmit — debe quedar en 0 errores
npx expo-doctor    # Salud Expo SDK 57 — antes de tocar app.json/deps nativas/permisos
```

Verificación mínima antes de dar por terminada una tarea: `npm run lint` + prueba en Expo Go del flujo tocado. Si tocaste `app.json`, deps nativas o permisos → suma `npx expo-doctor`. (Aún no hay suite `npm test`; la validación de dominio se ejerce vía Zod + Expo Go.)

## Arquitectura (Clean Architecture + puertos — respetar capas)

```
src/
├── core/
│   ├── domain/            # 100% TS puro, SIN imports de react-native/expo/firebase. types.ts, auth.schemas.ts (Zod)
│   └── application/auth/  # Casos de uso puros con puertos inyectados (Register/Login/LogoutUser). Sin Firebase ni storage
├── infrastructure/
│   ├── auth/              # AuthContext (adapta Firebase → usecases) + RBAC (user | moderator | admin)
│   ├── database/          # userProfileService (Firestore) + firestoreErrors
│   ├── firebase/          # config.ts — único lugar que inicializa Firebase
│   └── persistence/       # storage.ts (AsyncStorage)
├── presentation/
│   ├── theme.ts           # AndeanTheme — ÚNICA fuente de color/espaciado/tipo. No hardcodear hex fuera de aquí
│   ├── components/auth|   # Componentes compartidos (nombres canónicos, sin prefijo Native*)
│   └── views/auth|home|_template/  # AuthView (HU-01/02), HomeView (post-login), _template (base HU-03…HU-10)
└── docs/                  # ARCHITECTURE.md, DESIGN_RULES.md, MODULE_GUIDE.md, USER_STORIES.md (HU-01/02 al 100%, resto roadmap)
```

Reglas de dependencia: `presentation → infrastructure → core/{application,domain}`. `core` nunca importa RN/Expo/Firebase. Validación solo con Zod (`core/domain/auth.schemas.ts`). `App.tsx` trae el `Gate`: sin sesión → `AuthView`, con sesión → `HomeView`. Estado global en store Zustand; nada de `localStorage`/`window`/`document` en nativo.

**Componentización (detalle en `CLEAN_ARCH_RULES.md`):** vistas delgadas que componen (~150 líneas), forms de feature colocalizados (`views/<feature>/`), primitivas reusables compartidas vía `index.ts` (Regla de Tres). **Prohibido el prefijo `Native*`**: un concepto = un nombre canónico (`AuthView`, `Button`); la plataforma la da la carpeta. Antes de crear un componente: reusar → grep → extraer.

## Convenciones obligatorias

- **Expo managed workflow. NO eject.** Módulos nativos solo vía Expo Modules API o config plugins.
- **UI 100% nativa:** `View/Text/Pressable/TextInput/FlatList` + `StyleSheet` con `AndeanTheme`.
- **Seguro por defecto:** `expo-location` (cuando llegue HU-08) solo en contexto con justificación. RBAC: `user`, `moderator`, `admin`; fallbacks locales de auth SOLO ante error de red (`isNetworkError`), nunca ante credencial inválida.
- **Estilo código:** TypeScript strict, `import type` para tipos, casos de uso puros con puertos, componentes pequeños, nombres en inglés para código y props.
- **Repo vivo (multi-dev):** el otro dev avanza HU-03… en paralelo y el repo se actualiza
  constantemente. Antes de codificar: `git pull --ff-only`, revisa `git status` y
  `git log --oneline -10`, y haz `grep` de lo que necesites — **reutiliza código antes de
  recrearlo**. Si otro módulo ya resolvió tu necesidad (servicio, vista, primitiva), úsalo.
- **Commits:** pequeños y entendibles, sin secretos (`.env` jamás se commitea; ver `.env.example`).

## Protocolo HU (obligatorio — anti-rehacer tareas)

Antes de codificar CUALQUIER tarea ligada a una HU:

1. Lee la sección correspondiente en `docs/USER_STORIES.md` (criterios + evidencia).
2. Contrasta doc vs código real (2 min): ¿los archivos de evidencia existen? ¿los criterios se cumplen?
3. **Si el doc está desactualizado o el criterio es ambiguo → PREGUNTA al usuario antes de codificar** (tool `question`). Nunca re-hagas ni re-interpretes en silencio.
4. Al terminar: actualiza la evidencia en `docs/USER_STORIES.md` en el mismo commit del cambio.

Regla de oro: doc desactualizado = tarea bloqueada hasta confirmar.

Comando del equipo para ejecutar HUs: `/hu-checklist HU-0X` (plantilla de 4 fases: planificar → codificar → validar → cerrar).

## Alcance por HU (anti-invento)

La HU y sus criterios de aceptación son el alcance exacto: **ni un campo, ni un botón, ni un filtro de más**.
Todo elemento visible debe trazarse a un criterio (`HU-0X Cn`); lo que no está pedido no se crea.
Si algo parece "necesario" pero no está en los criterios → se PREGUNTA al usuario antes de agregarlo.
Los defaults del sistema (rol `user`, timestamps) no cuentan como campos.

## Skills (cómo trabajar con ellas)

- El agente descubre skills vía tool `skill` y las carga bajo demanda:
  - `skill({ name: "expo-sdk57-guide" })` — SDK 57, permisos, EAS, OTA vs rebuild.
  - `skill({ name: "andean-design-system" })` — tokens, componentes, anti-slop.
  - `skill({ name: "native-ux-patterns" })` — estados, offline, GPS, a11y, performance.
- Skills oficiales externas (instalar una vez por máquina, requieren `npx skills`):
  ```bash
  npx skills add expo/skills                                   # oficiales Expo (expo-overview, expo-router, expo-native-ui, expo-design-system, expo-animation, expo-data-fetching, expo-upgrade, eas-*)
  npx skills add vercel-labs/agent-skills --skill react-native-skills   # performance RN
  npx skills add vercel-labs/agent-skills --skill composition-patterns  # componentización
  ```
- Subagentes del proyecto (`.opencode/agents/`, invocar con `@nombre`): `@expo-native-expert`, `@andean-ui-designer`, `@mobile-ux-reviewer`, `@clean-arch-guardian`, `@qa-tdd-runner`.

## Docs fuente (leer bajo demanda, no todo de golpe)

- `CLEAN_ARCH_RULES.md` — capas, puertos/usecases, screaming/colocalización, Regla de Tres.
- `docs/ARCHITECTURE.md` + `docs/MODULE_GUIDE.md` — estructura y cómo agregar módulos HU-03…HU-10.
- `docs/DESIGN_RULES.md` — sistema visual completo.
- `docs/USER_STORIES.md` — HU-01/02 al 100%, resto roadmap.
- `app.json` / `firestore.rules` — permisos y reglas antes de cambiar auth/datos.

## Anti-patrones (fallan review)

1. Importar `localStorage`, `window`, `document` o `express` en código nativo.
2. Hardcodear colores/espaciados fuera de `theme.ts`; crear archivos `Native*`; validar manual sin Zod.
3. Lógica de negocio dentro de vistas (va en `core/application` con puertos); roles chequeados solo en UI.
4. Fallbacks de auth ante credencial inválida (solo red, vía `isNetworkError`).
5. Silenciar errores de `tsc` o `expo-doctor` en el reporte final.
