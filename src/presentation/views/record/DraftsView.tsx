import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Plus, FilePlus2, Route, Clock } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import { AndeanTheme } from '../../theme';
import { sheetStyles } from '../../components/layout';

/**
 * HU-07 T6 (lista) — Pantalla de borradores del usuario.
 * Muestra los borradores propios y permite crear una planificación nueva.
 * Contenido sobre la hoja blanca del hub RecordView (capas duales).
 */
interface DraftsViewProps {
  onCreate: () => void;
  onOpen: (id: string) => void;
}

export const DraftsView: React.FC<DraftsViewProps> = ({ onCreate, onOpen }) => {
  const { currentUser } = useAuth();
  const { drafts, isLoading, listDrafts } = usePlanStore();

  useEffect(() => {
    if (currentUser) listDrafts(currentUser.uid);
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  const difficultyLabel: Record<string, string> = {
    facil: 'Fácil',
    moderado: 'Moderado',
    dificil: 'Difícil',
    experto: 'Experto',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable
        onPress={onCreate}
        style={styles.createBtn}
        accessibilityRole="button"
        accessibilityLabel="Crear nueva ruta"
      >
        <Plus size={16} color={AndeanTheme.colors.white} />
        <Text style={styles.createBtnText}>CREAR NUEVA RUTA</Text>
      </Pressable>

      <Text style={sheetStyles.sectionTitle}>Mis borradores</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
          <Text style={sheetStyles.muted}>Cargando borradores…</Text>
        </View>
      ) : drafts.length === 0 ? (
        <View style={styles.emptyCard}>
          <FilePlus2 size={22} color={AndeanTheme.colors.fieldIcon} />
          <Text style={styles.emptyTitle}>Todavía no tienes borradores</Text>
          <Text style={styles.emptyText}>
            Crea una ruta nueva, selecciona el punto inicial y el destino sobre el mapa, y
            guárdala como borrador para retomarla después.
          </Text>
        </View>
      ) : (
        drafts.map((draft) => (
          <Pressable
            key={draft.id}
            onPress={() => onOpen(draft.id)}
            style={({ pressed }) => [styles.draftCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Abrir borrador ${draft.title || 'sin título'}`}
          >
            <View style={styles.draftHeader}>
              <View style={styles.draftIcon}>
                <Route size={16} color={AndeanTheme.colors.fieldIcon} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.draftTitle}>{draft.title || 'Borrador sin título'}</Text>
                <Text style={styles.draftMeta}>
                  {difficultyLabel[draft.difficulty] ?? draft.difficulty} ·{' '}
                  {draft.startPoint.name} → {draft.endPoint.name}
                </Text>
              </View>
            </View>
            <View style={styles.draftFooter}>
              <Clock size={12} color={AndeanTheme.colors.fieldHint} />
              <Text style={styles.draftDate}>
                Actualizado {new Date(draft.updatedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.openHint}>ABRIR →</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, gap: 12 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.cta,
    borderRadius: 16,
    paddingVertical: 14,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: AndeanTheme.colors.white,
  },
  center: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyCard: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: AndeanTheme.colors.ink, fontSize: 14, fontWeight: '800' },
  emptyText: {
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  draftCard: {
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 14,
  },
  pressed: { opacity: 0.8 },
  draftHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  draftIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftTitle: { color: AndeanTheme.colors.ink, fontSize: 14, fontWeight: '800' },
  draftMeta: { color: AndeanTheme.colors.inkSecondary, fontSize: 11, marginTop: 2 },
  draftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AndeanTheme.colors.fieldBorder,
  },
  draftDate: { color: AndeanTheme.colors.fieldHint, fontSize: 10, flex: 1 },
  openHint: { color: AndeanTheme.colors.primaryDark, fontSize: 10, fontWeight: '800' },
});
