---
description: Crear pantalla o módulo (nombre canónico + theme + plantilla) desde nombre
agent: build
---

Crea $ARGUMENTS siguiendo el sistema andino:

1. Carga `skill({ name: "andean-design-system" })`, lee `src/presentation/theme.ts` y
   `src/presentation/views/_template/ModuleTemplateView.tsx` + `docs/MODULE_GUIDE.md`.
2. Implementa `$ARGUMENTSView` (nombre canónico, NUNCA prefijo `Native*`) con
   `View/Text/Pressable/TextInput/FlatList` + `StyleSheet` + `AndeanTheme`
   (cero hex fuera del theme, `SafeAreaView`, targets ≥ 44pt, `accessibilityLabel`).
   Si el form es grande, divídelo colocalizado en `views/$ARGUMENTS/` (`CLEAN_ARCH_RULES.md`).
3. Lógica fuera de la vista: usecase + puertos en `core/application`, validación Zod en
   `core/domain`, ruta nueva colgada del `Gate` en `App.tsx`.
4. Cierra con `npm run lint`. Si tocaste permisos/deps nativas, suma `npx expo-doctor`.
