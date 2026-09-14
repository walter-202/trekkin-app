# TREKKIN APP — DESIGN RULES & EXPO SDK 57 ARCHITECTURE GUIDE

Este documento abstrae la esencia visual y técnica del sistema de diseño de **Trekkin App**, garantizando coherencia estética entre las vistas de autenticación, el sidebar drawer y la futura migración a **Expo SDK 57** (React Native / NativeWind).

---

## 1. Identidad Visual y Paleta Cromática

El sistema visual fusiona la estética técnica de montaña andina de alta precisión (*Andean Topo Engine*) con una ergonomía limpia y de alto contraste.

### A. Tonos Oscuros Andinos (Dark Mode & Backdrops)
* **Andean Pine / Deep Canopy**: `#051712` — Fondo principal de pantallas oscuras y sidebar drawer.
* **Slate Forest**: `#082019` — Superficie de tarjetas y contenedores elevados en modo oscuro.
* **Topo Grid Line**: `rgba(16, 185, 129, 0.08)` — Trazado sutil de curvas de nivel o retícula cartográfica.
* **Borde Táctico**: `#12382c` — Contorno fino de 1px en tarjetas, sin sombras pesadas.

### B. Láminas Claras de Alto Contraste (Light Sheets & Modals)
* **Crisp Pure White**: `#ffffff` — Hoja emergente inferior (`rounded-t-[32px]`) para formularios interactivos.
* **Canvas Soft Tint**: `#fcfdfd` / `#f8faf9` — Fondos de campos de entrada (`bg-stone-50/70`).
* **Input Borders**: `#e2e8f0` (`border-stone-200`) con realce en foco a `#059669` (`focus:ring-2`).

### C. Acentos de Marca y Estados
* **Deep Emerald CTA**: `#064e3b` (hover: `#043e2f`) — Botón principal de acción con tipografía blanca y flecha direccional.
* **Vibrant Active Green**: `#10b981` / `#059669` — Indicador "En Vivo", selector activo de navegación y anillos de avatar.
* **Andean Gold (Logros & Cumbres)**: `#d97706` / `#f59e0b` — Medallas de guía de montaña, insignias de verificación.
* **Alpine Alert / SOS**: `#ef4444` / `#dc2626` — Indicador de grabación activa, auditoría de rescate y botón de salida.

---

## 2. Tipografía y Reglas de Etiquetado

1. **Titulares de Pantalla**: `font-extrabold text-2xl tracking-tight text-white` (en dark) o `text-stone-900` (en light).
2. **Micro-Labels de Formulario**:
   - `text-[10px] font-bold tracking-wider uppercase text-stone-500`
   - Deben ubicarse siempre arriba del campo con espaciado consistente (`space-y-1.5`).
3. **Pills de Versión y Estado**:
   - `TREK-BOLIVIA PRO v2.4`: Fondo verde bosque translúcido con badge verde brillante (`bg-emerald-500/20 text-emerald-400 border border-emerald-500/30`).
   - `NUEVA EXPEDICIÓN`: Micro-badge superior con icono de ruta o compás.
4. **Campos con Icono Integrado**:
   - Todos los inputs incluyen un icono temático `lucide-react` a la izquierda (`w-4 h-4 text-stone-400`) y controles contextuales a la derecha (e.g. ojo para revelar contraseña).

---

## 3. Especificación de Componentes Clave

### A. Formulario "Crear Cuenta" & "Iniciar Sesión" (Image 1)
- **Cabecera**:
  - Botón circular volver (`<`) a la izquierda.
  - Centro: Pill `TREK-BOLIVIA PRO v2.4`.
  - Botón circular radar/brújula a la derecha.
  - Subtítulo `NUEVA EXPEDICIÓN` sobre `Crear Cuenta`.
  - Descripción: *"Únete a la comunidad de excursionistas y montañeros de Bolivia."*
- **Contenedor**: Hoja blanca curvada (`rounded-t-[32px]` o `rounded-[28px]` modal) con campos en orden:
  1. Nombre Completo (`Ej. Mateo Condori`)
  2. Correo Electrónico (`andino@trekbolivia.bo`)
  3. Usuario (`@caminante_bolivia`)
  4. Contraseña (`Mínimo 8 caracteres` + toggle ojo)
  5. Verificar Contraseña (`Repite tu contraseña` + toggle ojo)
  6. Checkbox de términos y normas de seguridad en montaña.
  7. Botón CTA `CREAR CUENTA →` en esmeralda profundo.
  8. Separador `O REGÍSTRATE CON`.
  9. Botón social `Continuar con Google`.

### B. Sidebar Drawer en Modo Oscuro (Image 2)
- **Ancho del Drawer**: **Al menos el 60% del ancho del dispositivo** (`w-[82vw] max-w-sm sm:w-[65vw]`).
- **Encabezado**: Logo Trek-Bolivia Pro con icono de montañista en caja verde + `ANDEAN TOPO GUIDE` + botón cerrar `X`.
- **Ficha de Usuario**:
  - Avatar con anillo verde y pulso online `●`.
  - Nombre verificado con checkmark (`Alejandro Condori ✓`).
  - Identificador `@caminante_andino`.
  - Badge dorado `Guía de Montaña`.
  - Mini-tarjetas gemelas: `Cumbres: 18 registradas` y `GPS Fix: ±2.4m Preciso`.
- **Sección Exploración Principal**:
  - `INICIO`: Mapa Explorer Topográfico (con pill `● En Vivo`).
  - `PERFIL`: Bitácora, Logros & Medallas (con badge contador `12`).
  - `DESCARGAS`: Zonas Offline Sin Señal (con badge `3 Activas`).
  - `NUEVA RUTA`: Trazar Track & Grabar GPX (con punto rojo de grabación).
- **Sección Herramientas Pro**:
  - `Capas IGM & Satélite`.
  - `Auditoría de Rescate` (con badge de emergencia `SOS SOS`).
- **Tarjeta de Memoria Offline**:
  - Almacenamiento ocupado (e.g. `4.2 GB / 64 GB`).
  - Barra de progreso verde.
  - Estado: `Cordillera Real sincronizada ✓ Al día`.
- **Footer**:
  - Botones inferiores `Ajustes` y `Salir`.
  - Versión del motor `v2.8.4 • Andean Engine` y estado `● Conectado`.

---

## 4. Compatibilidad y Migración a Expo SDK 57

Para migrar esta arquitectura a **Expo SDK 57 (React Native)**:

1. **Capa de Dominio (`/src/core/domain`)**:
   - Es 100% TypeScript puro, sin dependencias de DOM ni navegador. Se copia directamente a la app de Expo.
2. **Capa de Firebase (`/src/infrastructure/firebase`)**:
   - Compatible con Firebase JS v10/v11 en Expo SDK 57 (usando `@react-native-async-storage/async-storage` para persistencia de Auth) o `@react-native-firebase`.
3. **Capa de Estilos (`NativeWind v4` / Tailwind)**:
   - Las clases de Tailwind aplicadas (`bg-[#051712]`, `rounded-3xl`, `text-emerald-400`) se mapean 1:1 en componentes `View`, `Text`, `Pressable` y `TextInput`.
4. **Almacenamiento Offline de Mapas**:
   - En web se utiliza **IndexedDB** (`tileCacheDB.ts`).
   - En Expo SDK 57 se migra de manera transparente a **expo-file-system** + **expo-sqlite** con la misma interfaz de repositorio.
