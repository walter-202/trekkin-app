import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AndeanTheme } from '../../theme';
import { ScreenShell, sheetStyles } from '../../components/layout';

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
 * Capas duales (DESIGN_RULES): cabecera en shell oscuro (`ScreenShell` header) +
 * contenido en la hoja blanca (CTAs simples → `Button` variant "primary" de `components/ui`).
 */
export const ModuleTemplateView: React.FC<{ title?: string }> = ({
  title = 'Nuevo módulo (plantilla)',
}) => {
  return (
    <ScreenShell
      body="scroll"
      header={
        <View style={styles.headerBlock}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Plantilla</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
      }
    >
      <Text style={sheetStyles.inkSecondary}>
        Reemplaza este archivo siguiendo los 9 pasos del encabezado. No agregues lógica de
        Firebase directamente en la vista.
      </Text>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    gap: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: AndeanTheme.borderRadius.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AndeanTheme.colors.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: AndeanTheme.colors.primaryLight,
  },
  title: {
    color: AndeanTheme.colors.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});
