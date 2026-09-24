# Guía de creación de módulos (Clean Architecture)

Usa esta checklist cada vez que implementes una HU nueva (HU-03…HU-10).
Ejemplo resuelto: **auth (HU-01/HU-02)**. Ejemplo a replicar: **HU-03 Explorar**.

## Checklist (9 pasos, en orden)

1. **Dominio — tipos** → `src/core/domain/<modulo>.ts`
   - Solo `type/interface`, sin imports de Firebase/React.
   - Ej.: `RouteModel`, `RouteStatus`, `Checkpoint`.
2. **Dominio — validación** → `src/core/domain/<modulo>.schemas.ts`
   - Esquemas **zod** con mensajes en español.
   - Son la única fuente de verdad (la UI no re-valida por su cuenta).
3. **Aplicación — casos de uso** → `src/core/application/<modulo>/*.usecase.ts`
   - Funciones `async` puras con **puertos inyectados**:
     ```ts
     interface Ports { getAll: () => Promise<RouteModel[]>; /* … */ }
     export async function ListPublishedRoutesUseCase(ports: Ports) { /* … */ }
     ```
   - Prohibido importar `firebase/*`, `AsyncStorage` o `react-native` aquí.
4. **Infraestructura — servicio** → `src/infrastructure/database/<modulo>Service.ts`
   - Único archivo con `firebase/firestore` (`collection`, `getDocs`, `onSnapshot`…).
   - Envuelve errores con `handleFirestoreError(err, OperationType.X, path)`.
5. **Infraestructura — estado (si aplica)** → `src/infrastructure/persistence/use<Modulo>Store.ts`
   - `zustand` para caché local + flags (`isLoading`, `error`).
6. **Infraestructura — permisos** → usa `useAuth().hasRole([...])`
   - Público: sin guard. Privado: `['user','admin']`.
   - Admin: `['admin']`. Sin HU-09: no hay guard de moderación.
7. **Presentación — vista** → `src/presentation/views/<modulo>/<Modulo>View.tsx`
   - Copia `views/_template/ModuleTemplateView.tsx` y renombra.
   - Solo hooks + casos de uso. Estilos con `AndeanTheme` + `DESIGN_RULES.md`.
8. **Presentación — registro** → `src/App.tsx`
   - Monta la vista en el `Gate`/navegador y protege por sesión/rol.
9. **Docs + reglas** → `docs/USER_STORIES.md` + `firestore.rules`
   - Marca la HU como implementada y agrega/ajusta su `match /<coleccion>/{id}`.

## Ejemplo concreto: HU-03 Explorar rutas

```
src/core/domain/route.ts                 (RouteModel ya existe en types.ts)
src/core/domain/route.schemas.ts         (filtros: texto + dificultad)
src/core/application/explore/ListRoutes.usecase.ts   (puertos: listPublished())
src/infrastructure/database/routeService.ts          (query where status=='published')
src/presentation/views/explore/ExploreView.tsx       (catálogo + detalle + mapa)
```

## Errores comunes (no hacer)

- ❌ `import { db } from '.../firebase/config'` dentro de `presentation/` o `core/`.
- ❌ Validar solo en el formulario sin esquema zod en dominio.
- ❌ Guardar el rol desde el cliente sin verificarlo en `firestore.rules`.
- ❌ Poner lógica de negocio dentro del `View` (debe vivir en el use case).
- ❌ Romper la paleta (`#0F1412` fondo, `#1C2420` tarjeta, `#2A3630` borde, `#10B981` acento).
- ❌ Segundo motor de mapas (`react-native-maps`, `PlanMap`, Google SDK). Usar `<TrekMap />`.

## 10. Mapas (HU-03/04/06/07/08)

Sigue el checklist de arriba para dominio/aplicación; el **renderer** no es un módulo de negocio.

1. Contrato: `src/presentation/components/map/TrekMap.types.ts` (`TrekMapProps`).
2. Estilo online: `src/infrastructure/map/mapStyle.ts` (OpenFreeMap). HU-03 **no** descarga pack.
3. Vistas: importar `{ TrekMap }` desde `presentation/components/map/TrekMap`.
   Metro elige `TrekMap.web.tsx` o `TrekMap.native.tsx`.
4. Plan y formatos: `docs/plan/plan_mapas_on_offline.md`. Packs HU-04: `docs/plan/offline_maps.md`.
   - GPX/GeoJSON: `src/core/domain/trackFormats.ts`.
   - PMTiles/MBTiles: `src/core/domain/mapPackFormats.ts` + `ResolveOfflinePack` + `TrekMap.offlinePackPath`.
5. Probar: `pnpm start` → `w` (http://localhost:8081) y QR Expo Go. V2 nativo: `expo prebuild` + `expo run:android` (rompe Expo Go).

```
src/infrastructure/map/mapStyle.ts
src/infrastructure/map/mapBridge.ts
src/presentation/components/map/TrekMap.tsx
src/presentation/views/explore/RouteDetailView.tsx   ← ya monta TrekMap
```
