# Índice — Informe formal Trekkin App

> **Qué es este documento.** Informe formal en Markdown (UNANDES), con estructura de `docs/INFORME_TEMPLATE.docx` (molde académico + Scrum) y una extensión propia: **por cada sprint, análisis → diseño → implementación → pruebas**.
>
> **Fuente de avance:** `docs/USER_STORIES.md` (figura oficial, rev. 2026-09-17) y `docs/BACKLOG.md`. El docx académico anterior solo aporta UML/capturas; **no** manda en porcentajes ni en hechos técnicos.
> **Regla:** nada es 100% sin matriz de dispositivo + revisión UI + OK del equipo.
> **Idioma:** prosa académica en español neutro; identificadores de código en inglés.

## Estructura

| #   | Archivo                                                      | Contenido                                                                                                      |
| --- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| 1   | [01-parte-teorica.md](01-parte-teorica.md)                   | Introducción, problema, objetivos, justificación, metodología (Scrum + investigación), recursos, marco teórico |
| 2   | [02-marco-practico.md](02-marco-practico.md)                 | Análisis del problema, RF/RNF/RN, HU, Product Backlog, MoSCoW, planificación de sprints                        |
| 3   | [03-sprints.md](03-sprints.md)                               | **Extensión:** por cada sprint — análisis, diseño, implementación y pruebas                                    |
| 4   | [04-casos-uso-uml.md](04-casos-uso-uml.md)                   | Casos de uso, diagramas UML, arquitectura y modelo de datos                                                    |
| 5   | [05-ui-bibliografia-anexos.md](05-ui-bibliografia-anexos.md) | Interfaz de usuario, bibliografía, anexos                                                                      |

## Cómo mejorar este informe

1. Editá el archivo correspondiente (un capítulo por archivo).
2. Si cambia el avance de una HU, actualizá `%` solo en `USER_STORIES.md` y luego reflejalo aquí.
3. Si agregás una imagen nueva, guardala en `docs/assets/informe/` y referenciala con ruta relativa `../assets/informe/…`.
4. Al exportar a `.docx`, podés concatenar los `01`…`05` en este orden (el índice queda como TOC).

## Fuentes que mandan

| Tema                  | Fuente                                                                |
| :-------------------- | :-------------------------------------------------------------------- |
| % por HU              | `docs/USER_STORIES.md`                                                |
| Qué falta / orden     | `docs/BACKLOG.md` (BK-001…BK-053)                                     |
| Arquitectura y datos  | `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `firestore.rules`, código |
| Texto de apoyo (no %) | `docs/INFORME_PRESENTACION_CLIENTE.md`                                |
| Estructura académica  | `docs/INFORME_TEMPLATE.docx` (Lidemoda — solo molde)                  |

## Imágenes disponibles (`docs/assets/informe/`)

- UML: `uml-uso-sistema-overview.png`, `uml-cu03-explorar.png`, `uml-cu09-finalizar-gestionar.png`, `uml-com-cu04-descarga.png`
- UI: `ui-catalogo-hu03.png`, `ui-detalle-illimani.png`, `ui-detalle-valle-luna.png`, `ui-grabar-pausada.png`, `ui-grabar-ruta-gps.png`, `ui-actividad-guardada.png`, `ui-planificacion-vacia.png`
