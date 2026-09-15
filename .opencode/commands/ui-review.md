---
description: Revisar UI+UX+a11y de un diff o pantalla sin editarla
agent: mobile-ux-reviewer
subtask: true
---

Audita $ARGUMENTS (diff, pantalla o flujo) con la matriz de `native-ux-patterns`: estados loading/empty/error/offline, auth con mensajes claros, targets ≥ 44pt, contraste AA dark, `FlatList` performante.

Extra en rondas de correcciones del equipo (ej. eliminación de HU-09): verifica referencias
huérfanas en lo visible (roles, rutas, labels, roadmap del Home) y repórtalas como major.

Salida: tabla Severidad | Ubicación | Problema | Fix. Sin editar archivos.
