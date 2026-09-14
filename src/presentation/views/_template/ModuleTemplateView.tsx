import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * PLANTILLA — Cómo crear un nuevo módulo (ej. HU-03 Explorar).
 *
 * 1. Copia esta carpeta a `src/presentation/views/<modulo>/` y renombra el componente.
 * 2. Crea tu dominio en `src/core/domain/<modulo>.ts` (tipos puros, sin Firebase).
 * 3. Crea tus validaciones en `src/core/domain/<modulo>.schemas.ts` (zod).
 * 4. Crea tus casos de uso en `src/core/application/<modulo>/*.usecase.ts`
 *    (funciones puras con puertos inyectados, sin imports de Firebase).
 * 5. Crea tu servicio en `src/infrastructure/database/<modulo>Service.ts`
 *    (único lugar donde se usa `firebase/firestore`).
 * 6. Si necesitas estado global, crea `src/infrastructure/persistence/use<Modulo>Store.ts` (zustand).
 * 7. Esta vista SOLO llama a hooks/casos de uso. Prohibido `firebase/*` aquí.
 * 8. Protege la ruta con `useAuth().hasRole([...])` si el módulo es privado.
 * 9. Registra la vista en `src/App.tsx` y documenta la HU en `docs/USER_STORIES.md`.
 *
 * Reglas de diseño: ver `docs/DESIGN_RULES.md` (fondo #051712, tarjetas #0E2E24,
 * borde #1A4537, acento #10B981, micro-labels uppercase).
 */
export const ModuleTemplateView: React.FC<{ title?: string }> = ({
  title = 'Nuevo módulo (plantilla)',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>
        Reemplaza este archivo siguiendo los 9 pasos del encabezado. No agregues lógica de
        Firebase directamente en la vista.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051712',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#F9FAFB', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  body: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', maxWidth: 300 },
});
