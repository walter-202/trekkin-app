import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Plus, FilePlus2, Route, Clock } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import { AndeanTheme } from '../../theme';

/**
 * HU-07 T6 (lista) — Pantalla de borradores del usuario.
 * Muestra los borradores propios y permite crear una planificación nueva.
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
      <Pressable onPress={onCreate} style={styles.createBtn}>
        <Plus size={16} color="#064E3B" />
        <Text style={styles.createBtnText}>CREAR NUEVA RUTA</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>MIS BORRADORES</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.primary} />
          <Text style={styles.muted}>Cargando borradores…</Text>
        </View>
      ) : drafts.length === 0 ? (
        <View style={styles.emptyCard}>
          <FilePlus2 size={22} color={AndeanTheme.colors.textSecondary} />
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
          >
            <View style={styles.draftHeader}>
              <View style={styles.draftIcon}>
                <Route size={16} color={AndeanTheme.colors.textSecondary} />
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
              <Clock size={12} color={AndeanTheme.colors.textMuted} />
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
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  createBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: '#064E3B' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: AndeanTheme.colors.textMuted,
    marginTop: 4,
  },
  center: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  emptyCard: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: AndeanTheme.colors.text, fontSize: 14, fontWeight: '800' },
  emptyText: { color: AndeanTheme.colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  draftCard: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 16,
    padding: 14,
  },
  pressed: { opacity: 0.8 },
  draftHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  draftIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftTitle: { color: AndeanTheme.colors.text, fontSize: 14, fontWeight: '800' },
  draftMeta: { color: AndeanTheme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  draftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AndeanTheme.colors.border,
  },
  draftDate: { color: AndeanTheme.colors.textMuted, fontSize: 10, flex: 1 },
  openHint: { color: AndeanTheme.colors.primaryLight, fontSize: 10, fontWeight: '800' },
});