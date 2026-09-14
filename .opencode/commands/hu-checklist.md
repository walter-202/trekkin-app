---
description: Checklist de 4 fases para ejecutar una HU (planificar, codificar, validar, cerrar)
agent: build
---

Genera y guía el checklist de $ARGUMENTS (una HU, ej. `HU-03`). No codifiques hasta cerrar Fase 1.

## Fase 1 — Planificar (sin código)
- [ ] Leer la sección $ARGUMENTS en `docs/USER_STORIES.md` (criterios + evidencia).
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
      (screenshot, output de lint, o "visto en Expo Go por @x"). Nada de palabra.
- [ ] `npm run lint` (0 errores). Si tocó nativo/permisos: `npx expo-doctor`.

## Fase 4 — Cierre
- [ ] Matriz Expo Go: flujo feliz, error, sin red/offline, persistencia al reabrir.
- [ ] Actualizar evidencia de $ARGUMENTS en `docs/USER_STORIES.md` en el mismo commit.
- [ ] Commit pequeño + push (nunca commitear `.env`; selectivo, sin `add -A` a ciegas).

## Reglas de equipo
1. Nadie codifica sin Fase 1 cerrada. 2. Fase 2 = un agente. 3. Fase 3 con evidencia.
4. Mejorar esta plantilla está permitido: si un paso sobra o falta, edítala y menciónalo en tu commit.
