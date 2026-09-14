---
description: Planificar feature HU con Clean Architecture + puertos antes de codificar
agent: build
---

Actúa en modo plan (no edites archivos todavía).

0. Protocolo HU (obligatorio si $ARGUMENTS toca una HU): lee su sección en
   `docs/USER_STORIES.md` y contrasta criterios vs código real. Si el doc está
   desactualizado o el criterio es ambiguo, PREGUNTA al usuario (tool `question`)
   antes de seguir. Doc desactualizado = plan bloqueado hasta confirmar.
1. Lee `docs/ARCHITECTURE.md`, `docs/MODULE_GUIDE.md` y los archivos implicados en $ARGUMENTS.
2. Alcance estricto: cada campo/botón propuesto cita su criterio (`HU-0X Cn`).
   Lo no pedido no se incluye; si parece necesario, se pregunta, no se asume.
3. Propón: dominio (`core/domain`) → usecase + puertos (`core/application`) → adaptadores
   (`infrastructure`) → UI (`presentation`, `Gate` si es ruta nueva), y criterios verificables.
4. Termina con plan numerado + verificación (`npm run lint`, matriz Expo Go).
