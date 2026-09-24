# INTERFAZ DE USUARIO, BIBLIOGRAFÍA Y ANEXOS

---

## 1. Interfaz de usuario (UI)

La UI es **100% React Native** (`View` / `Text` / `Pressable` / `TextInput` / `FlatList`) con `StyleSheet` y sistema de diseño **AndeanTheme** (paleta oscura de marca + hoja clara en formularios). Primitivas compartidas: `Button`, `Field`, `Banner`.

Capturas de pantalla de la aplicación en `` (prefijo `ui-`).

### 1.1 Autenticación (HU-01 / HU-02)

- `AuthView` + `RegisterForm` / `LoginForm`: shell oscuro + hoja blanca, CTA `primary`, validación Zod, toggle de contraseña.
- Errores y éxitos con `Banner`.

### 1.2 Explorar y detalle (HU-03)

**Catálogo (sin mapa en el feed):**

![Catálogo de rutas](ui-catalogo-hu03.png)

**Detalle con mapa y métricas:**

![Detalle Illimani](ui-detalle-illimani.png)

![Detalle Huayna Potosí](ui-detalle-huayna-potosi.png)

![Detalle Valle de la Luna](ui-detalle-valle-luna.png)

### 1.3 Planificación (HU-07)

![Planificación borradores](ui-planificacion-vacia.png)

### 1.4 Realizar ruta existente (HU-06)

![Lista de rutas para realizar](ui-realizar-ruta-lista.png)

### 1.5 Grabación y resultado (HU-08)

![Grabar ruta GPS](ui-grabar-ruta-gps.png)

![Grabar ruta pausada](ui-grabar-pausada.png)

![Actividad guardada](ui-actividad-guardada.png)

### 1.6 Checklist anti-verde (revisión de UI)

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

| HU    | Sprint | Suites principales                                          | Evidencia UI / dispositivo      |
| :---- | :----: | :---------------------------------------------------------- | :------------------------------ |
| HU-01 | S1     | `auth_hu1_hu2`                                              | UAT registro y login            |
| HU-02 | S1     | `auth_hu1_hu2`                                              | UAT sesión y perfil             |
| HU-03 | S2     | `catalog_hu3`, `route_*`, `map_service_hu3`                 | Capturas §1.2                   |
| HU-04 | S3     | `offline_*`, `map_pack_formats`                             | UAT modo avión en dispositivo   |
| HU-05 | S3     | `share_hu5`, `gpx_delivery`                                 | UAT share sheet nativo          |
| HU-06 | S3     | `activity_hu6`, `activity_store`, `background_location`       | Captura §1.4; UAT GPS campo     |
| HU-07 | S2     | `plan_hu7`, `track_formats_*`                               | Captura §1.3                    |
| HU-08 | S2     | `activity_hu8`, `activity_track_db`, `activity_gpx_storage` | Capturas §1.5                   |
| HU-09 | S3     | `share_hu5`, `gpx_delivery`                                 | UAT compartir desde resumen     |
| HU-10 | S3     | `user_management_hu10`                                      | UAT administración de usuarios  |
| HU-11 | S3     | `offline_*`                                                 | UAT offline certificado         |
| HU-12 | S2     | Por definir                                                 | UAT fotos en grabación          |
| HU-13 | S2     | `catalog_hu3` (extensión)                                   | UAT filtros distancia/duración  |

### Anexo B — Evidencia visual

| Tipo | Cantidad | Ubicación |
| :--- | :------: | :-------- |
| Capturas UI | 9 | §1 de este archivo (`ui-*.png`) |
| Diagramas UML | 17 | [02-marco-practico.md](02-marco-practico.md) — sección Diseño por sprint + inventario final |

Archivos fuente: carpeta `` (diagramas `uml-*` y capturas `ui-*`).

### Anexo C — Comandos de verificación

```bash
npm run lint    # tsc --noEmit — debe quedar en 0 errores
npm test        # suites puras + smoke Firestore
npx expo-doctor # si cambian deps nativas o permisos
```

### Anexo D — Criterios de verificación del producto

1. Pruebas automatizadas (`npm test`) y análisis estático (`npm run lint`) sin errores.
2. Escenarios UAT documentados en [02-marco-practico.md](02-marco-practico.md) ejecutados en Expo Go (Android, iOS y web cuando aplique).
3. Validación de flujos críticos en campo: modo avión, GPS en segundo plano y compartición por enlace.
4. Revisión de interfaz conforme al sistema de diseño Andean (paleta, tipografía y componentes descritos en §1).

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

| Fecha      | Cambio                                                                                        | Responsable     |
| :--------- | :-------------------------------------------------------------------------------------------- | :-------------- |
| 2026-09-24 | Borrador inicial en Markdown a partir de plantilla UNANDES + fuentes del repo                 | Equipo / agente |
| 2026-09-24 | Corrección: 3 sprints × 1 semana; extracción completa de 26 imágenes del docx académico       | Equipo / agente |
| 2026-09-24 | Alineación plantilla: diseño sin código; RF-01…RF-44; HU-09 compartir ruta grabada (RF-36/37) | Equipo / agente |
| 2026-09-24 | UML integrado en sprints; cap. 04 = UI/bibliografía/anexos (elim. 04-casos-uso-uml)            | Equipo / agente |

---

_Fin del informe formal — volver al [índice](README.md)._
