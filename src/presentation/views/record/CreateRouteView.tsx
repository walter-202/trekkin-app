import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Save } from 'lucide-react-native';
import { PlanPointPicker } from '../../components/plan/PlanPointPicker';
import { Button } from '../../components/ui';
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
        <Text style={styles.label}>NOMBRE PROVISIONAL DE LA RUTA *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Ruta del Diablo / Camino de la Muerte"
          placeholderTextColor={AndeanTheme.colors.fieldHint}
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

      <Button
        title="GUARDAR BORRADOR"
        onPress={handleSave}
        loading={saving}
        disabled={!start || !end}
        icon={<Save size={15} color={AndeanTheme.colors.white} />}
      />

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
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: AndeanTheme.colors.fieldLabel,
    marginBottom: 6,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AndeanTheme.colors.ink,
    fontSize: 13,
  },
  help: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, lineHeight: 17 },
  helpStart: { color: AndeanTheme.colors.primaryDark, fontWeight: '800' },
  helpEnd: { color: AndeanTheme.colors.amber, fontWeight: '800' },
  error: { color: AndeanTheme.colors.errorText, fontSize: 11 },
  note: { color: AndeanTheme.colors.fieldHint, fontSize: 11, textAlign: 'center' },
});