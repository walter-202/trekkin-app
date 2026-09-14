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
   - Público: sin guard. Privado: `['user','moderator','admin']`.
   - Moderación: `['moderator','admin']`. Admin: `['admin']`.
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
- ❌ Romper la paleta (`#051712` fondo, `#0E2E24` tarjeta, `#1A4537` borde, `#10B981` acento).
