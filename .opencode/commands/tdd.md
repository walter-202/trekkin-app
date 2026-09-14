---
description: TDD sobre dominio puro (schemas y usecases con puertos falsos)
agent: build
---

Aplica TDD sobre $ARGUMENTS (schema Zod o usecase en `core/`):

1. Escribe primero el caso que falla: `safeParse` para schemas; usecase con puertos
   falsos en memoria (sin Firebase ni storage).
2. Implementa lo mínimo en `src/core/domain/` o `src/core/application/`
   (TS puro, sin RN/Expo/Firebase).
3. Verifica con `npm run lint` + matriz Expo Go del flujo. Cuando exista `src/tests/`,
   el caso vive ahí. Reporta casos añadidos y resultado.
