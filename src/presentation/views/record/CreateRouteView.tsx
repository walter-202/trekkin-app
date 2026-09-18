import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Save } from 'lucide-react-native';
import { PlanPointPicker } from '../../components/plan/PlanPointPicker';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import type { PlannedPoint } from '../../../core/domain/plan';
import { AndeanTheme } from '../../theme';

/**
 * HU-07 T1/T2/T3/T4 — Crear una nueva ruta.
 * Mapa con selección de punto inicial provisional y destino, y guardado como borrador.
 * El nombre provisional de la ruta es obligatorio (feedback del equipo).
 */
interface CreateRouteViewProps {
  onSaved: () => void;
}

export const CreateRouteView: React.FC<CreateRouteViewProps> = ({ onSaved }) => {
  const plan = usePlanStore((s) => s.plan);
  const { setPoints, saveDraft, saving, setPlanMeta } = usePlanStore();
  const [title, setTitle] = useState(plan?.title ?? '');
  const [start, setStart] = useState<PlannedPoint | null>(plan?.startPoint ?? null);
  const [end, setEnd] = useState<PlannedPoint | null>(plan?.endPoint ?? null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async () => {
    setLocalError(null);
    const name = title.trim();
    if (!name) {
      setLocalError('Escribe el nombre provisional de la ruta para poder guardar el borrador.');
      return;
    }
    if (!start || !end) {
      setLocalError('Selecciona el punto inicial y el destino en el mapa.');
      return;
    }
    setPlanMeta({ title: name });
    const pointsOk = await setPoints(start, end);
    if (!pointsOk) return;
    const ok = await saveDraft();
    if (ok) onSaved();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.fieldGroup}>
        <Text style={styles.microLabel}>NOMBRE PROVISIONAL DE LA RUTA *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Ruta del Diablo / Camino de la Muerte"
          placeholderTextColor={AndeanTheme.colors.textMuted}
        />
      </View>

      <Text style={styles.help}>
        Toca el mapa para fijar el <Text style={styles.helpStart}>inicio provisional</Text> y el{' '}
        <Text style={styles.helpEnd}>destino provisional</Text> de la ruta.
      </Text>

      <PlanPointPicker
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
      />

      {localError && <Text style={styles.error}>{localError}</Text>}

      <Pressable
        onPress={handleSave}
        disabled={saving || !start || !end}
        style={({ pressed }) => [
          styles.saveBtn,
          pressed && styles.pressed,
          (!start || !end) && styles.saveBtnDisabled,
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#064E3B" size="small" />
        ) : (
          <>
            <Save size={15} color="#064E3B" />
            <Text style={styles.saveBtnText}>GUARDAR BORRADOR</Text>
          </>
        )}
      </Pressable>

      <Text style={styles.note}>
        Al guardar quedará en "Mis borradores" y podrás retomarlo sin perder la información.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  fieldGroup: { marginBottom: 2 },
  microLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: AndeanTheme.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AndeanTheme.colors.text,
    fontSize: 13,
  },
  help: { color: AndeanTheme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  helpStart: { color: AndeanTheme.colors.primary, fontWeight: '800' },
  helpEnd: { color: AndeanTheme.colors.accentWarning, fontWeight: '800' },
  error: { color: AndeanTheme.colors.danger, fontSize: 11 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveBtnDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  saveBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: '#064E3B' },
  note: { color: AndeanTheme.colors.textMuted, fontSize: 11, textAlign: 'center' },
});