import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AndeanTheme } from '../../theme';

/**
 * Plantilla oficial para crear una vista nueva de cualquier HU (HU-03…HU-10).
 *
 * Pasos obligatorios para crear un módulo nuevo:
 * 1. Define las entidades y tipos puros en `src/core/domain/<modulo>.ts`.
 * 2. Define el esquema Zod si hay entrada de usuario (`<modulo>.schemas.ts`).
 * 3. Crea el caso de uso puro con puertos inyectados en `src/core/application/<modulo>/`.
 * 4. Implementa el adaptador Firestore en `src/infrastructure/database/<modulo>Service.ts`.
 * 5. Crea el store Zustand con persistencia offline en `src/infrastructure/persistence/use<Modulo>Store.ts`.
 * 6. Diseña la vista UI nativa en `src/presentation/views/<modulo>/<Modulo>View.tsx`.
 * 7. Esta vista SOLO llama a hooks/casos de uso. Prohibido `firebase/*` aquí.
 * 8. Protege la ruta con `useAuth().hasRole([...])` si el módulo es privado.
 * 9. Registra la vista en `src/App.tsx` y documenta la HU en `docs/USER_STORIES.md`.
 *
 * Reglas de diseño: ver `docs/DESIGN_RULES.md` y `AndeanTheme` en `src/presentation/theme.ts`.
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
    backgroundColor: AndeanTheme.colors.background,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: AndeanTheme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  body: { color: AndeanTheme.colors.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 300 },
});
