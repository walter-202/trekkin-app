# TREKKIN APP — Informe para el cliente (v1 en camino)

> **Qué es este documento:** la explicación del proyecto en palabras comunes, sin tecnicismos. Dice qué hace la app hoy, qué falta para la versión 1 y cómo se va a comprobar. Todo lo que aquí se afirma se puede rastrear a una historia de usuario (`docs/USER_STORIES.md`) y a una tarea del backlog (`docs/BACKLOG.md`).
> Revisión 2026-09-15. Regla de la casa: **nada es 100% hasta probarlo en un teléfono real, con revisión de diseño y con el visto bueno del usuario**.

---

## 1. El problema y la solución, en simple

En la montaña boliviana (Cordillera Real, valles interandinos) **el celular se queda sin señal**. Las apps normales de mapas dejan de funcionar justo cuando más se las necesita. Además, no hay un lugar único donde estén las rutas verificadas: dónde hay agua, dónde acampar, cuánto se tarda, qué tan dura es la caminata.

**Trekkin App** es una app de celular pensada para eso:

1. **Ver rutas antes de salir:** catálogo abierto de caminatas con distancia, tiempo, dificultad y fotos. Sin necesidad de registrarse para mirar.
2. **Llevarse el mapa en el bolsillo:** descargar una ruta con su mapa para consultarla en modo avión, sin internet.
3. **Caminar con guía:** el teléfono marca tu posición sobre el recorrido, avisa al pasar por puntos clave (agua, descanso, peligro) y guarda tu caminata.
4. **Compartir y cuidar:** enviar rutas a compañeros por enlace y, para administradores, cuidar la comunidad (bloquear cuentas, dar roles).

---

## 2. Estado honesto: qué funciona hoy y qué falta para la v1

Semáforo: 🟢 funciona · 🟡 a medias · 🔴 pendiente.

| Historia | En palabras simples | Estado | Qué falta para la v1 (ver backlog) |
| :--- | :--- | :---: | :--- |
| HU-01 Crear cuenta | Registrarse con nombre, correo, alias y contraseña | 🟢 95% | Verificación de correo |
| HU-02 Entrar y perfil | Entrar, ver mi ficha, cambiar nombre/alias, salir | 🟢 90% | Cambio de contraseña y tema visual |
| HU-03 Ver rutas | Catálogo abierto, fotos de portada, ver detalle y mapa nativo | 🟢 90% | Pruebas en matriz física de teléfonos |
| HU-04 Llevar sin internet | Botón descargar ruta y cálculo real de MB | 🟡 55% | Descarga física de teselas a almacenamiento local |
| HU-05 Compartir | Enviar ruta por enlace y WhatsApp/Telegram | 🟢 85% | Adjuntar el archivo de la caminata al mensaje |
| HU-06 Caminar con guía | Seguir la ruta con GPS, pausar, terminar, ver historial | 🟡 65% | Que siga grabando con pantalla apagada, migrar vista a TrekMap |
| HU-07 Planear ruta | Marcar puntos, guardar borrador e importar GPX/KML | 🟢 85% | Edición fina de puntos en pantalla (deshacer/borrar) |
| HU-08 Grabar ruta nueva | Grabar caminata, paradas y exportar archivo GPX | 🟢 80% | Grabación con pantalla bloqueada |
| HU-09 Moderación | — | 🚫 Eliminada | Los admin revisan; no hay rol moderador |
| HU-10 Administrar | Ver usuarios, bloquear, cambiar roles, con registro de todo | 🟢 90% | Paginar listas largas |

**Lectura ejecutiva:** cuentas, catálogo, compartir y administración están sólidas. La v1 se juega en dos cosas: **el mapa de fondo sin internet** y **el GPS en campo**. Todo el plan de trabajo (BK-001 a BK-054) apunta ahí.

---

## 3. Cómo funciona para cada persona (interacciones)

```mermaid
flowchart TD
    A["Abrir la app"] --> B{"¿Tienes cuenta?"}
    B -- "No, solo miro" --> C["Ver catálogo de rutas"]
    B -- "Sí / me registro" --> D["Entrar a mi sesión"]
    C --> E["Abrir el detalle de una ruta"]
    D --> E
    E --> F{"¿Qué quieres hacer?"}
    F -- "Llevarla sin internet" --> G["Descargar ruta y mapa"]
    F -- "Caminarla hoy" --> H["Iniciar recorrido con GPS"]
    F -- "Pasarla a un amigo" --> I["Compartir por enlace"]
    F -- "Crear una nueva" --> J["Planear borrador / Grabar con GPS"]
    G --> K["Consultar en modo avión"]
    H --> L["Ver resumen e historial"]
    D --> M{"¿Eres admin?"}
    M -- "Sí" --> N["Gestionar usuarios y roles"]
```

Notas de trazabilidad: el visitante mira sin fricción (HU-03); las acciones de escritura piden entrar (HU-01/HU-02); el admin tiene su zona separada (HU-10).

---

## 4. El mapa tiene dos capas (idea clave de la v1)

Un error común: creer que el archivo de la caminata **es** el mapa. No. Son dos cosas:

```mermaid
flowchart LR
    subgraph ARRIBA["Capa de la caminata (tu dato)"]
        U["Tu línea: puntos, altura, tiempo"]
    end
    subgraph ABAJO["Capa del mapa de fondo"]
        M["Ríos, calles, curvas de nivel"]
    end
    U --> O["Lo que ves en pantalla"]
    M --> O
```

* **Capa de la caminata:** archivo `.gpx` (el estándar abierto que entienden Garmin, Wikiloc y Google Earth). La app lo dibuja y también lo entiende en `.kml`, `.kmz`, `.tcx`, `.csv`, `.plt` cuando alguien lo trae de otro lado. Sin mapa de fondo, esta capa se ve como una línea sobre fondo gris: sirve, pero no orienta.
* **Capa del mapa de fondo:** mosaicos vectoriales abiertos (sin llaves de pago) que dibujan montañas, ríos y caminos con nitidez a cualquier zoom, y se guardan en **un solo paquete por ruta** para usar sin internet. Nada de miles de fotitos sueltas.

---

## 5. Qué guarda el sistema (simple)

```mermaid
erDiagram
    USERS ||--o{ ROUTES : "publica"
    USERS ||--o{ ACTIVITIES : "camina y guarda"
    ROUTES ||--o{ ACTIVITIES : "guia"
    USERS ||--o{ ACCOUNT_LOGS : "audita el admin"

    USERS {
        string uid PK "Identificador de la persona"
        string email "Correo, no se cambia"
        string displayName "Nombre completo"
        string username "Alias público"
        string role "user o admin"
        boolean isBlocked "Cuenta suspendida o no"
        number summitsCount "Cumbres registradas"
    }

    ROUTES {
        string id PK "Código de la ruta"
        string title "Nombre de la caminata"
        string region "Zona, ej Cordillera Real"
        string difficulty "fácil a experto"
        string status "borrador, en revisión, publicada"
        number distanceKm "Distancia"
        number durationMinutes "Tiempo estimado"
        list waypoints "Puntos de la línea"
        list checkpoints "Agua, descanso, peligro..."
    }

    ACTIVITIES {
        string id PK "Código de la caminata hecha"
        string routeTitle "Qué ruta se caminó"
        string status "terminada o incompleta"
        number distanceCoveredKm "Cuánto se caminó de verdad"
        list recordedPoints "Puntos del GPS"
    }

    ACCOUNT_LOGS {
        string id PK "Código del registro"
        string action "bloqueo o cambio de rol"
        string actorId "Qué admin lo hizo"
        number createdAt "Cuándo, no se borra"
    }
```

En buen cristiano: personas, rutas, caminatas hechas y un cuaderno de auditoría que nadie puede borrar. Los detalles finos están en `docs/DATABASE.md`.

---

## 6. Cómo se hablan las partes (3 recorridos que importan)

### 6.1. Registrarse, entrar y ver mi ficha (HU-01 / HU-02)

```mermaid
sequenceDiagram
    autonumber
    actor P as Persona
    participant A as App
    participant N as Nube

    P->>A: Lleno el formulario y acepto las normas
    A->>A: Revisa que todo esté bien lleno
    A->>N: Crea la cuenta y guarda mi ficha
    N-->>A: Listo
    A-->>P: Cuenta creada, ahora entra con tu correo
    P->>A: Entro con correo y contraseña
    A->>N: Verifica quién soy y si estoy suspendido
    N-->>A: Mis datos
    A-->>P: Veo mi ficha con mis cumbres y kilómetros
```

### 6.2. Descargar una ruta y usarla en modo avión (HU-03 / HU-04)

```mermaid
sequenceDiagram
    autonumber
    actor C as Caminante
    participant A as App
    participant N as Nube
    participant T as Teléfono

    C->>A: Busco una ruta y abro su detalle
    A->>N: Dame las rutas publicadas
    N-->>A: Catálogo con fotos y datos
    C->>A: Toco Descargar ruta
    A-->>C: Pesa tanto, ¿confirmas?
    C->>A: Confirmo
    A->>T: Guarda el mapa y la caminata en un paquete
    T-->>A: Guardado con sello Disponible sin conexión
    C->>A: Activo modo avión y abro la ruta
    A-->>C: Mapa y datos visibles, sin internet
```

### 6.3. Caminar con GPS y guardar la caminata (HU-06 / HU-08)

```mermaid
sequenceDiagram
    autonumber
    actor C as Caminante
    participant A as App
    participant G as GPS del teléfono
    participant N as Nube

    C->>A: Inicio el recorrido
    A-->>C: Grabando, sígueme en el mapa
    loop Cada pocos segundos
        G->>A: Aquí estoy
        A->>A: Limpia el ruido y suma distancia
        A->>A: ¿Pasé por agua o descanso? Lo marco
        A-->>C: Actualiza mapa, tiempo y lo que falta
    end
    C->>A: Termino la caminata
    A->>A: ¿Llegaste al final o casi? Terminada o incompleta
    A->>N: Sube la caminata si hay señal, si no la guarda
    N-->>A: Guardada
    A-->>C: Resumen con km, ritmo y desnivel
```

---

## 7. Por dentro: piezas y responsabilidades (resumen no técnico)

```mermaid
flowchart TD
    subgraph PANTALLAS["Lo que tocas"]
        V["Pantallas: explorar, mapa, perfil, caminata"]
    end
    subgraph REGLAS["Las reglas del juego"]
        R["Casos de uso: registrar, descargar, grabar, compartir"]
    end
    subgraph DATOSR["Lo que debe ser verdad siempre"]
        D["Validaciones: correos, roles, categorías de paradas"]
    end
    subgraph CONEX["Conexiones con el mundo"]
        F["Nube, GPS, archivos y memoria del teléfono"]
    end
    V --> R
    R --> D
    R --> F
```

La idea que le sirve al cliente: **las reglas no dependen de la nube**. Si mañana se cambia de proveedor, las pantallas y las reglas siguen iguales; solo se cambia el conector. Detalle técnico en `docs/ARCHITECTURE.md`.

---

## 8. Cómo sabemos que funciona (validación real, no promesas)

1. **Pruebas automáticas: 126 que pasan** (`npm test` vía Docker). Cubren registro, sesión, compartir, borradores, descarga, máquina de estados del GPS y bitácora admin.
2. **Lo pendiente para decir 100%** (gates BK-050 a BK-054, obligatorios):
   * Probar en teléfono real con Expo Go **y** en versión instalada de desarrollo.
   * Probar en modo avión lo que dice funcionar sin internet.
   * Revisión de diseño sin bloqueos + revisión del código por una persona + visto bueno del usuario.
3. **Preguntas que siempre hacemos antes de programar:** ¿en qué historia estamos y quién la pide?, ¿cuáles son los criterios exactos?, ¿esto que me pides está dentro de lo acordado o es algo nuevo?

---

## 9. Camino a la v1 (resumen del backlog)

```mermaid
gantt
    title Camino a la v1
    dateFormat YYYY-MM-DD
    section Mapa base
    Mapa vectorial en el teléfono :a1, 2026-09-20, 10d
    section Sin internet
    Descarga real de mapa por ruta :a2, 2026-09-25, 12d
    section Caminata
    Archivos de caminata y GPS en campo :a3, 2026-10-01, 12d
    section Datos
    Ordenar base de datos y reintentos :a4, 2026-10-08, 8d
    section Cierre
    Validación en teléfono y revisiones :a5, 2026-10-14, 7d
```

Detalle tarea por tarea en `docs/BACKLOG.md` (BK-001 a BK-054).

---

## 10. Guion de presentación (7 minutos, en tus palabras)

**Minuto 0:00–1:30 — El dolor real.**
*"Imaginen estar a 4.600 metros en el Huayna Potosí. El teléfono dice Sin Servicio y el mapa se queda en blanco. Eso le pasa hoy a quien camina en Bolivia. Trekkin nació para que el mapa, la ruta y tu posición sigan ahí aunque no haya internet."*

**Minuto 1:30–3:30 — Qué hace.**
*"Muestren el catálogo: cualquiera puede ver rutas, filtrar por dificultad y abrir el detalle con distancia, tiempo y puntos de agua. Luego la descarga: un toque y la ruta queda Disponible sin conexión. Después el GPS: te ve moverte, te marca las paradas y te guarda la caminata. Y todo se puede compartir por enlace."*

**Minuto 3:30–5:00 — Por qué es sólido.**
*"Dos decisiones: el mapa tiene dos capas —tu caminata y el fondo— y las reglas del negocio no dependen del proveedor de nube. Si algo se cae, el teléfono guarda y sincroniza después. Cuentas con roles, bitácora que no se borra y validaciones en cada dato que entra."*

**Minuto 5:00–6:30 — Cómo lo comprobamos.**
*"126 pruebas automáticas que pasan, y una regla dura: nada es 100% sin probarlo en teléfono real, en modo avión cuando aplique, con revisión de diseño y de código, y con su visto bueno."*

**Minuto 6:30–7:00 — Cierre.**
*"Cuentas, catálogo, compartir y administración ya caminan. La v1 se completa con el mapa sin internet y el GPS en campo, con plan y fechas en mano. Pasemos a la demo en el teléfono. Gracias."*

---

## 11. Mini glosario (por si alguien pregunta)

* **Modo avión / sin conexión:** usar la app sin internet, con lo ya descargado.
* **Borrador:** ruta en preparación, solo la ve su autor.
* **Publicada:** ruta revisada y visible para todos.
* **Paquete sin internet:** el mapa de fondo + la caminata guardados juntos en el teléfono.
* **Archivo .gpx:** el formato abierto de caminatas que entienden Garmin, Wikiloc y Google Earth.
* **Bitácora:** cuaderno de auditoría donde queda quién bloqueó o cambió roles, sin borrado.
