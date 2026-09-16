# Autopartes V1.0 — Modelo de Base de Datos (ER normalizado, 3FN)

> Fuente de verdad de datos para la aplicación Android nativa de Comercialización de
> Autopartes y Gestión de Inventarios. Alcance: **V1.0** (RF-01…RF-13).
> Stack: **Room/SQLite local + API REST** (JWT). Persistencia local offline-first.

## 1. Principios

- **3FN**: cada tabla tiene clave primaria, sin dependencias parciales ni transitivas.
- **Relación N:M núcleo del negocio**: `part_variants` (repuestos equivalentes por
  fabricante) ↔ `oem_parts` (códigos de fábrica OEM) vía tabla puente `variant_oem_map`.
- **Agrupación OEM**: el stock de un grupo se calcula como `SUM(inventory.cantidad)`
  de todas las variantes mapeadas al mismo `oem_part.id` (RF-11).
- **Garaje Virtual sin placa**: `vehicles` solo tiene Marca, Modelo, Año y
  Cilindrada/Motor; un único `es_activo=true` por usuario (RF-02/RF-03/RF-05).
- **Invalidación inmediata de tokens** (RF-04): el JWT porta `ver`; el servidor rechaza
  si `ver < users.token_version`. Bloquear cuenta o cambiar rol ⇒ `token_version++`.

## 2. Diagrama ER (resumen)

```
users 1──N vehicles                vehicles N──M oem_parts (via vehicle_compatibilities)
users 1──N sessions
users 1──N purchase_order_drafts

oem_parts 1──N part_variants (variantes equivalentes)
oem_parts N──M part_variants (via variant_oem_map)   ← núcleo OEM
oem_parts 1──N purchase_order_lines

part_variants 1──N inventory
suppliers 1──N purchase_order_drafts
purchase_order_drafts 1──N purchase_order_lines
```

Nota de modelado: existen **dos** vías variante→OEM para cubrir el caso real:

- `part_variants.oem_part_id` (FK directa, variante principal) y
- `variant_oem_map` (N:M para variantes equivalentes compatibles con varios códigos OEM).
  La agrupación comercial de stock y el reorden **siempre** usan `variant_oem_map`
  (si está vacía para un grupo, cae al `oem_part_id` directo).

## 3. Tablas

### 3.1 `users` — RF-01, RF-04

| Campo                       | Tipo      | Notas                                        |
| --------------------------- | --------- | -------------------------------------------- |
| `id`                        | PK        | UUID                                         |
| `email`                     | TEXT      | **UNIQUE** (login)                           |
| `password_hash`             | TEXT      | hash bcrypt/argon, nunca plano               |
| `nombre_completo`           | TEXT      | obligatorio                                  |
| `rol`                       | TEXT      | `cliente` (default) \| `vendedor` \| `admin` |
| `estado`                    | TEXT      | `activo` \| `bloqueado`                      |
| `token_version`             | INT       | default 0; ++ al bloquear/cambiar rol        |
| `created_at` / `updated_at` | TIMESTAMP |                                              |

Reglas: registro crea `cliente` por defecto (RF-01). Solo `admin` cambia rol/estado
(RF-04).

### 3.2 `sessions` — RF-01

| Campo                | Tipo       | Notas                             |
| -------------------- | ---------- | --------------------------------- |
| `id`                 | PK         | UUID                              |
| `user_id`            | FK → users |                                   |
| `refresh_token_hash` | TEXT       | hash del refresh token            |
| `token_version`      | INT        | snapshot al emitir; valida el JWT |
| `expires_at`         | TIMESTAMP  |                                   |
| `revocado`           | BOOLEAN    | logout = true                     |

Reglas: logout revoca la sesión (RF-01). `token_version` de `users` > snapshot ⇒
rechazo y revocación (RF-04).

### 3.3 `vehicles` — RF-02, RF-03, RF-05

| Campo              | Tipo       | Notas                             |
| ------------------ | ---------- | --------------------------------- |
| `id`               | PK         | UUID                              |
| `user_id`          | FK → users |                                   |
| `marca`            | TEXT       | obligatorio                       |
| `modelo`           | TEXT       | obligatorio                       |
| `anio`             | INT        | obligatorio                       |
| `cilindrada_motor` | TEXT       | obligatorio (ej. "1.6", "2000cc") |
| `es_activo`        | BOOLEAN    | filtro automático de catálogo     |

Reglas: **sin número de placa** (exclusión V1.0). Constraints:
`UNIQUE (user_id, es_activo)` con `es_activo=true` (un solo vehículo activo por user);
se resuelve con índice parcial `WHERE es_activo = 1`.

### 3.4 `oem_parts` — RF-06, RF-11, RF-12, RF-13

| Campo           | Tipo      | Notas                                            |
| --------------- | --------- | ------------------------------------------------ |
| `id`            | PK        | UUID                                             |
| `codigo_oem`    | TEXT      | **UNIQUE**                                       |
| `nombre_comun`  | TEXT      | indexado para búsqueda (rf "pastillas de freno") |
| `categoria`     | TEXT      | opcional (frenos, suspensión…)                   |
| `reorder_point` | INT       | punto de reorden del grupo OEM (RF-12)           |
| `created_at`    | TIMESTAMP |                                                  |

### 3.5 `part_variants` — RF-07, RF-10, RF-11

| Campo               | Tipo           | Notas                                    |
| ------------------- | -------------- | ---------------------------------------- |
| `id`                | PK             | UUID                                     |
| `oem_part_id`       | FK → oem_parts | variante principal                       |
| `marca_fabricante`  | TEXT           | ej. "Bosch", "ACDelco"                   |
| `codigo_fabricante` | TEXT           |                                          |
| `nombre_comercial`  | TEXT           |                                          |
| `precio_unitario`   | REAL           | precio de la variante (V1.0 sin carrito) |

Reglas: `UNIQUE (marca_fabricante, codigo_fabricante)`.

### 3.6 `variant_oem_map` — RF-06, RF-11 (N:M núcleo)

| Campo         | Tipo               | Notas                                  |
| ------------- | ------------------ | -------------------------------------- |
| `variant_id`  | FK → part_variants |                                        |
| `oem_part_id` | FK → oem_parts     |                                        |
|               |                    | PK compuesta (variant_id, oem_part_id) |

Reglas: una variante puede equivaler a varios códigos OEM. Stock agrupado =
`SUM(inventory) JOIN variant_oem_map GROUP BY oem_part_id`.

### 3.7 `inventory` — RF-11, RF-13

| Campo             | Tipo               | Notas                |
| ----------------- | ------------------ | -------------------- |
| `id`              | PK                 | UUID                 |
| `part_variant_id` | FK → part_variants |                      |
| `cantidad`        | INT                | unidades disponibles |
| `lote`            | TEXT               | opcional             |
| `fecha_ingreso`   | TIMESTAMP          |                      |

### 3.8 `vehicle_compatibilities` — RF-03, RF-05

| Campo         | Tipo           | Notas        |
| ------------- | -------------- | ------------ |
| `vehicle_id`  | FK → vehicles  |              |
| `oem_part_id` | FK → oem_parts |              |
|               |                | PK compuesta |

Reglas: filtro Garaje→catálogo: al estar activo un vehículo, el catálogo muestra las
partes compatibles con ese vehículo.

### 3.9 `suppliers` — RF-13

| Campo      | Tipo | Notas |
| ---------- | ---- | ----- |
| `id`       | PK   | UUID  |
| `nombre`   | TEXT |       |
| `telefono` | TEXT |       |
| `email`    | TEXT |       |

### 3.10 `purchase_order_drafts` — RF-13 (Should)

| Campo         | Tipo           | Notas              |
| ------------- | -------------- | ------------------ |
| `id`          | PK             | UUID               |
| `supplier_id` | FK → suppliers | proveedor sugerido |
| `created_by`  | FK → users     | admin que genera   |
| `estado`      | TEXT           | `borrador`         |
| `fecha`       | TIMESTAMP      |                    |

### 3.11 `purchase_order_lines` — RF-13 (Should)

| Campo                | Tipo                       | Notas                                   |
| -------------------- | -------------------------- | --------------------------------------- |
| `id`                 | PK                         | UUID                                    |
| `po_draft_id`        | FK → purchase_order_drafts |                                         |
| `oem_part_id`        | FK → oem_parts             | repuesto a reabastecer                  |
| `stock_actual`       | INT                        | snapshot agrupado del grupo             |
| `cantidad_requerida` | INT                        | = reorder_point − stock_actual (mín. 0) |

## 4. Reglas de consulta clave

- **Búsqueda OEM / nombre común** (RF-06): `oem_parts` por `codigo_oem` (índice único) o
  `nombre_comun` `LIKE`/FTS4 → respaldo sub-2s (RNF-02): índice + FTS en Room.
- **Tarjeta resumen** (RF-07): oem_part + primera variante con imagen/precio.
- **Mostrador vendedor** (RF-10): `precio(Σ variantes)` + `stock(Σ inventory)` del grupo
  OEM en un solo `JOIN`+`GROUP BY`.
- **Stock crítico** (RF-12): `SUM(inventory) <= reorder_point` por `oem_part_id`.
- **Sugerencia OC** (RF-13): grupos con stock < reorder_point; cantidad =
  `reorder_point - stock_actual`; proveedor candidato por variante/supplier.

## 5. Seguridad local (RNF-03)

- Room encriptado opcional (SQLCipher) o cifrado de campos sensibles (refresh token).
- JWT almacenado en almacenamiento seguro (EncryptedSharedPreferences / Keystore).
