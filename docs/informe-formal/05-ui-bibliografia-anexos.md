# INTERFAZ DE USUARIO, BIBLIOGRAFÍA Y ANEXOS

---

## 1. Interfaz de usuario (UI)

La UI es **100% React Native** (`View` / `Text` / `Pressable` / `TextInput` / `FlatList`) con `StyleSheet` y tokens exclusivos de `AndeanTheme` (`src/presentation/theme.ts`). Primitivas compartidas: `Button`, `Field`, `Banner`. Patrón de capas duales: shell oscuro (marca) + hoja clara (formularios). Referencia completa: `docs/DESIGN_RULES.md`.

### 1.1 Autenticación (HU-01 / HU-02)

- `AuthView` + `RegisterForm` / `LoginForm`: shell oscuro + hoja blanca, CTA `primary`, validación Zod, toggle de contraseña.
- Errores y éxitos con `Banner`.

### 1.2 Explorar y detalle (HU-03)

**Catálogo (sin mapa en el feed):**

![Catálogo de rutas](../assets/informe/ui-catalogo-hu03.png)

**Detalle con mapa y métricas:**

![Detalle Illimani](../assets/informe/ui-detalle-illimani.png)

![Detalle Valle de la Luna](../assets/informe/ui-detalle-valle-luna.png)

### 1.3 Planificación (HU-07)

![Planificación borradores](../assets/informe/ui-planificacion-vacia.png)

### 1.4 Grabación y resultado (HU-06 / HU-08)

![Grabar ruta GPS](../assets/informe/ui-grabar-ruta-gps.png)

![Grabar ruta pausada](../assets/informe/ui-grabar-pausada.png)

![Actividad guardada](../assets/informe/ui-actividad-guardada.png)

### 1.5 Checklist anti-verde (revisión de UI)

- [ ] ¿Formularios sobre `sheet` + `field` + `ink`?
- [ ] ¿El verde solo en acentos (iconos, links, CTA)?
- [ ] ¿Labels con `fieldLabel` / `fieldHint`, no `primary`?
- [ ] ¿Acciones destructivas en `danger` / `outline-danger`?
- [ ] ¿Admin usa `amber` para el badge?
- [ ] ¿Targets táctiles ≥ 48dp y `accessibilityLabel` en controles iconográficos?

---

## 2. Bibliografía

American Psychological Association. (2020). _Publication manual of the American Psychological Association_ (7.ª ed.). American Psychological Association.

Hernández-Sampieri, R., & Mendoza Torres, C. P. (2018). _Metodología de la investigación: Las rutas cuantitativa, cualitativa y mixta_. McGraw-Hill Education.

Kendall, K. E., & Kendall, J. E. (2011). _Análisis y diseño de sistemas_ (8.ª ed.). Pearson Educación.

Pressman, R. S., & Maxim, B. R. (2020). _Ingeniería del software: Un enfoque práctico_ (9.ª ed.). McGraw-Hill.

Schwaber, K., & Sutherland, J. (2020). _The Scrum Guide_. Scrum.org. https://scrumguides.org/

Expo. (s. f.). _Expo documentation_. https://docs.expo.dev/

React Native. (s. f.). _React Native documentation_. https://reactnative.dev/docs

Firebase. (s. f.). _Firebase documentation_. https://firebase.google.com/docs

MapLibre. (s. f.). _MapLibre GL JS documentation_. https://maplibre.org/maplibre-gl-js/docs/

OpenStreetMap. (s. f.). _OpenStreetMap Wiki_. https://wiki.openstreetmap.org/

PMTiles. (s. f.). _PMTiles specification_. https://docs.protomaps.com/pmtiles/

Topographic Data Working Group. (s. f.). _GPS Exchange Format (GPX) 1.1_. https://www.topografix.com/GPX/1/1/

Zod. (s. f.). _TypeScript-first schema validation_. https://zod.dev/

> **Nota de revisión:** al exportar, verificar que la bibliografía cumpla el manual APA de la cátedra y que no queden secretos ni claves pegados (la plantilla de ejemplo contenía una clave ajena: no copiarla).

---

## 3. Anexos

### Anexo A — Matriz de HU vs evidencia

| HU    | % (USER_STORIES) | Suites principales                                          | Evidencia UI / dispositivo |
| :---- | :--------------: | :---------------------------------------------------------- | :------------------------- |
| HU-01 |       95%        | `auth_hu1_hu2`                                              | Expo Go parcial            |
| HU-02 |       90%        | `auth_hu1_hu2`                                              | Expo Go parcial            |
| HU-03 |       90%        | `catalog_hu3`, `route_*`, `map_service_hu3`                 | Capturas en anexo B        |
| HU-04 |       80%        | `offline_*`, `map_pack_formats`                             | Físico / modo avión ⏳     |
| HU-05 |       80%        | `share_hu5`, `gpx_delivery`                                 | Share sheet ⏳             |
| HU-06 |       75%        | `activity_hu6`, `activity_store`, `background_location`     | Background ⏳              |
| HU-07 |       85%        | `plan_hu7`, `track_formats_*`                               | Captura planificación      |
| HU-08 |       85%        | `activity_hu8`, `activity_track_db`, `activity_gpx_storage` | Capturas grabación         |
| HU-09 |        —         | —                                                           | Eliminada                  |
| HU-10 |       90%        | `user_management_hu10`                                      | >50 usuarios ⏳            |

### Anexo B — Evidencia visual (capturas)

Ver §1 de este archivo (7 capturas) y §1 de [04-casos-uso-uml.md](04-casos-uso-uml.md) (4 diagramas UML). Archivos fuente: `docs/assets/informe/`.

### Anexo C — Comandos de verificación

```bash
npm run lint    # tsc --noEmit — debe quedar en 0 errores
npm test        # suites puras + smoke Firestore
npx expo-doctor # si cambian deps nativas o permisos
```

### Anexo D — Comandos y gates de cierre de HU

```bash
# Antes de marcar 100% en USER_STORIES:
# 1) Matriz Expo Go Android/iOS + web localhost + modo avión (BK-051)
# 2) /ui-review sin blockers (BK-052)
# 3) Preguntas de cierre y OK del equipo (BK-053)
# 4) Firebase Emulator cuando aplique reglas/Storage
```

### Anexo E — Entrevistas de levantamiento (plantilla — completar si la cátedra lo exige)

> **No inventado.** Completar con datos reales y reflejar en el marco práctico §1.

| Campo               | Detalle                                                                                                          |
| :------------------ | :--------------------------------------------------------------------------------------------------------------- |
| Nombre del proyecto | Trekkin App                                                                                                      |
| Entrevistado(a)     | _(pendiente)_                                                                                                    |
| Fecha               | _(pendiente)_                                                                                                    |
| Entrevistador(es)   | _(pendiente)_                                                                                                    |
| Preguntas clave     | ¿Cómo planifica hoy una salida? ¿Qué apps usa? ¿Qué falla sin señal? ¿Qué información necesita antes de caminar? |

---

## 4. Control de cambios del informe

| Fecha      | Cambio                                                                        | Responsable     |
| :--------- | :---------------------------------------------------------------------------- | :-------------- |
| 2026-09-24 | Borrador inicial en Markdown a partir de plantilla UNANDES + fuentes del repo | Equipo / agente |

---

_Fin del informe formal — volver al [índice](README.md)._
