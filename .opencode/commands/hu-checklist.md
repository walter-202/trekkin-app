---
description: Checklist de 4 fases para ejecutar una HU (planificar, codificar, validar, cerrar)
agent: build
---

Genera y guía el checklist de $ARGUMENTS (una HU, ej. `HU-03`). No codifiques hasta cerrar Fase 1.

## Fase 1 — Planificar (sin código)
- [ ] Declarar la HU en voz alta: pregúntala con `question`, verifícala contra
      `git branch --show-current` y el dueño en `docs/USER_STORIES.md`. Formato:
      “Estamos en HU-0X (dueño Y)”. Si la rama no coincide, dilo y confirma.
- [ ] Leer la sección $ARGUMENTS en `docs/USER_STORIES.md` (criterios + evidencia).
- [ ] Si la sección es scaffold o está desactualizada → **pedir criterios pegados**.
      Sin criterios no se avanza. Si la HU es de otro dueño, no reinterpretar: pedir los suyos.
- [ ] Contrastar doc vs código real: ¿existen los archivos de evidencia? ¿qué criterios ya se cumplen?
- [ ] Listar **preguntas bloqueantes** (doc desactualizado, criterio ambiguo, UX por definir) y hacerlas
      al usuario con la tool `question`. Doc desactualizado = bloqueado hasta confirmar.
- [ ] Tabla de trazabilidad: cada campo/botón propuesto → su criterio (`HU-0X Cn`).
      Lo no pedido no se incluye; si parece necesario, se pregunta, no se asume.
- [ ] Plan numerado: dominio → usecase + puertos → adaptadores → UI (`Gate` si es ruta nueva).

## Fase 2 — Codificar (UN solo agente)
- [ ] Ejecuta UN agente con el plan aprobado. Si el plan cambia, se vuelve a Fase 1.
- [ ] Reglas: vistas delgadas que componen, forms colocalizados, compartidos vía `index.ts`,
      prohibido prefijo `Native*`, validación solo con Zod, tokens solo de `AndeanTheme`.

## Fase 3 — Validar HU (criterio por criterio, con evidencia)
- [ ] Un checkbox por criterio, marcado solo con evidencia
      (screenshot, output de lint/test, o "visto en Expo Go por @x"). Nada de palabra.
- [ ] `npm run lint` (0 errores) + `npm test` (suite verde). Si tocó nativo/permisos: `npx expo-doctor`.
- [ ] Cambios visibles → `/ui-review` obligatorio (UI/UX/a11y con severidad; blockers frenan el cierre).
- [ ] Cambios transversales (roles, reglas Firestore, figura, deps) → revalidar HUs impactadas
      (lint + suite completa) y listarlas en el reporte, aunque "no las tocaste".
- [ ] Escala de validación (declararla siempre en el reporte):
      90% = automatizado verde + evidencia parcial en dispositivo.
      100% = matriz Expo Go completa + `/ui-review` sin blockers + confirmación del usuario.
      Prohibido declarar 100% sin esos tres.

## Fase 4 — Cierre
- [ ] Matriz Expo Go: flujo feliz, error, sin red/offline, persistencia al reabrir.
- [ ] Pedir validación al usuario con la tool `question` antes de cerrar: ¿qué probó en
      dispositivo? ¿qué correcciones (UI/UX/otras) detectó? Sin su respuesta no hay 100%.
- [ ] Pedir revisión humana sí o sí: que un dev revise el diff y dé su OK. Con correcciones
      → volver a Fase 2 (codificar), luego re-validar Fase 3. Sin OK humano no se cierra.
- [ ] Actualizar evidencia de $ARGUMENTS en `docs/USER_STORIES.md` en el mismo commit.
- [ ] Commit pequeño + push (nunca commitear `.env`; selectivo, sin `add -A` a ciegas).

## Reglas de equipo
1. Nadie codifica sin Fase 1 cerrada. 2. Fase 2 = un agente. 3. Fase 3 con evidencia.
4. Mejorar esta plantilla está permitido: si un paso sobra o falta, edítala y menciónalo en tu commit.
5. El % de validación se declara siempre; 100% exige matriz completa + `/ui-review` + OK del usuario.
