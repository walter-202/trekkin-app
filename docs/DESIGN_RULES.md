# TREKKIN APP — DESIGN RULES & EXPO SDK 57 ARCHITECTURE GUIDE

Este documento abstrae la esencia visual y técnica del sistema de diseño de **Trekkin App**, garantizando coherencia estética entre las vistas de autenticación, el sidebar drawer y el resto de módulos en **Expo SDK 57** (React Native + `StyleSheet` + `AndeanTheme`).

> **Fuente canónica de tokens:** [`src/presentation/theme.ts`](../src/presentation/theme.ts).
> **Prohibido** hardcodear hex fuera de `theme.ts` o de primitivas UI (`Button`, `Field`, `Banner`).

---

## 1. Identidad Visual y Paleta Cromática

El sistema visual fusiona la estética técnica de montaña andina de alta precisión (_Andean Topo Engine_) con una ergonomía limpia y de alto contraste.

### Regla de oro: no es todo verde

**Error común (corregido en HU-01 y HU-02):** pintar pantalla completa, campos, textos y botones en tonos esmeralda. Eso reduce legibilidad y aplasta la jerarquía visual.

**Patrón correcto — capas duales:**

| Capa             | Rol                                | Tokens (`AndeanTheme.colors`)                       | Dónde                                      |
| ---------------- | ---------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| **Shell oscuro** | Marca, navegación, identidad       | `background`, `card`, `border*`, `text`, `primary*` | Cabecera, drawer, zona superior de perfil  |
| **Hoja clara**   | Formularios, datos editables, CTAs | `sheet`, `field*`, `ink*`, `cta*`                   | Login, registro, edición y ficha de cuenta |

El verde (`primary`, `primaryLight`, `primaryDark`) es **acento**, no fondo universal: iconos, pills, links, anillo de avatar, estados activos. Los formularios viven sobre **blanco + stone** (`sheet`, `field`, `fieldBorder`, `ink`).

### A. Tonos Oscuros Andinos (Shell / Drawer / Cabecera)

- **Andean Pine**: `#051712` (`background`) — Fondo principal de pantallas y drawer.
- **Deep Canopy**: `#06231B` (`backgroundSecondary`) — Variante de fondo secundario.
- **Card Forest**: `#0E2E24` / `#153E32` (`card`, `cardElevated`) — Botones circulares, chips y avatar en zona oscura.
- **Borde Táctico**: `#1A4537` / `#265D4B` (`border`, `borderLight`) — Contorno 1px, sin sombras pesadas.
- **Texto sobre oscuro**: `#F9FAFB` / `#9CA3AF` (`text`, `textSecondary`).

### B. Láminas Claras de Alto Contraste (Light Sheets — HU-01/02)

- **Crisp Sheet**: `#FFFFFF` (`sheet`) — Hoja inferior con `borderTopRadius: 36` para formularios.
- **Field Canvas**: `#FAFAF9` (`field`) — Fondo de inputs e iconos de fila informativa.
- **Field Borders**: `#E7E5E4` / `#D6D3D1` (`fieldBorder`, `fieldBorderStrong`).
- **Tipografía sobre claro**: `#1C1917` / `#57534E` (`ink`, `inkSecondary`) — títulos y valores de formulario.
- **Micro-labels**: `#78716C` / `#A8A29E` (`fieldLabel`, `fieldHint`) — labels uppercase 10px.

### C. Acentos de Marca y Estados (uso puntual, no fondo)

- **Deep Emerald CTA**: `#064E3B` / `#043E2F` (`cta`, `ctaPressed`) — Botón primario en hoja clara (`Button` variant `primary`).
- **Vibrant Active Green**: `#10B981` / `#059669` (`primary`, `primaryDark`) — Links, iconos en shell, pill de versión, punto online.
- **Andean Gold**: `#D97706` / `#F59E0B` (`amber`, `amberLight`) — Badge `ADMINISTRADOR`, logros (no senderista estándar).
- **Alpine Alert**: `#EF4444` / `#DC2626` (`danger*`) — Cerrar sesión, errores, grabación SOS.
- **Feedback**: `successBg/Border/Text` y `errorBg/Border/Text` — Banners de confirmación y validación.

---

## 2. Tipografía y Reglas de Etiquetado

1. **Titulares en shell oscuro**: `fontWeight: 900`, `fontSize: 28–34`, `color: white` — solo en la zona superior (no en la hoja clara).
2. **Titulares en hoja clara**: `color: ink` (`#1C1917`), no verde.
3. **Micro-Labels de Formulario** (hoja clara):
   - `fontSize: 10`, `fontWeight: 800`, `letterSpacing: 0.8–1.5`, `textTransform: uppercase`
   - `color: fieldLabel` / `fieldHint` — **nunca** `primary` como color de label.
4. **Pills de versión** (shell oscuro): fondo `rgba(16,185,129,0.1)`, borde `rgba(16,185,129,0.2)`, texto `primaryLight`.
5. **Links interactivos** (hoja clara): `primaryDark` (`#059669`), no el CTA sólido.
6. **Campos con icono** (`Field.tsx`): icono `fieldIcon` sobre fondo `field`; borde `fieldBorder`.

---

## 3. Especificación de Componentes Clave

### A. HU-01 / HU-02 — Auth (referencia implementada)

Vistas canónicas: `AuthView.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `AuthModal.tsx`.

**Layout obligatorio — shell oscuro + hoja clara:**

- **Cabecera (shell):** botones circulares `card` + iconos `primary`; pill `TREK-BOLIVIA PRO v1.0`; eyebrow `◆ NUEVA EXPEDICIÓN` / `● ACCESO SEGURO`; título en blanco.
- **Hoja blanca** (`sheet`, `borderTopRadius: 36`): `RegisterForm` / `LoginForm` con `Field`, `Banner` (success/error en tonos pastel).
- **CTA primario:** `Button` variant `primary` → fondo `cta` (`#064E3B`), texto blanco.
- **Secundarios:** `outline-green`, `outline-danger`, `outline-muted` — borde + texto, sin relleno verde.
- **Anti-patrón:** inputs con `backgroundColor: card` o texto de formulario en `primaryLight`.

Campos de registro (orden): nombre, correo, alias, contraseña, confirmación, checkbox normas, CTA, switch login/registro, enlace invitado.

### B. HU-02 — Perfil (referencia implementada)

Vistas canónicas: `ProfileView.tsx`, `EditProfileView.tsx`.

Mismo patrón dual que auth:

- **Zona oscura:** avatar, nombre (`text` blanco), `@username` (`textSecondary`), badge rol (verde senderista / **ámbar** admin).
- **Hoja clara:** tarjeta informativa (`infoCard`, bordes `fieldBorder`), labels `fieldHint`, valores `ink`.
- **Acciones:** `EDITAR PERFIL` → `Button primary`; `Cerrar Sesión` → `outline-danger` (rojo, no verde).
- **Fuera de alcance HU-02:** métricas de montaña, toggle de tema, cambio de contraseña visible — no añadir sin criterio de HU.

### C. Sidebar Drawer en Modo Oscuro

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

## 4. Implementación Técnica (Expo SDK 57 — vigente)

1. **Estilos:** `StyleSheet.create` + `AndeanTheme` en [`theme.ts`](../src/presentation/theme.ts). No Tailwind/NativeWind en producción.
2. **Primitivas UI:** [`Button`](../src/presentation/components/ui/Button.tsx), [`Field`](../src/presentation/components/ui/Field.tsx), [`Banner`](../src/presentation/components/ui/Banner.tsx) — importar vía `components/ui`.
3. **Dominio (`/src/core/domain`):** TypeScript puro, sin RN/Expo/Firebase.
4. **Firebase:** JS SDK + `@react-native-async-storage/async-storage` para persistencia de auth.
5. **Mapas offline:** IndexedDB en web; destino nativo `expo-file-system` + SQLite (HU-04).

### Checklist anti-verde (code review)

- [ ] ¿La pantalla de formulario usa `sheet` + `field` + `ink`?
- [ ] ¿El verde aparece solo en acentos (iconos, links, pills, CTA)?
- [ ] ¿Los labels del formulario usan `fieldLabel`/`fieldHint`, no `primary`?
- [ ] ¿Acciones destructivas usan `danger`/`outline-danger`?
- [ ] ¿Admin usa `amber`, no otro verde extra?
