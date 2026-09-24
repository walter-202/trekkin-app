import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Save, CheckCircle2, ChevronRight, Pin } from 'lucide-react-native';
import { PlanPointPicker } from '../../components/plan/PlanPointPicker';
import { Button } from '../../components/ui';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import type { PlannedPoint } from '../../../core/domain/plan';
import type { RouteDifficulty } from '../../../core/domain/types';
import { AndeanTheme } from '../../theme';

/**
 * HU-07 T7 — Modificar la planificación antes de iniciar la ruta.
 * Permite editar título, dificultad y los puntos provisionales.
 */
interface PlanEditorViewProps {
  onContinue: () => void;
}

const DIFFICULTIES: { value: RouteDifficulty; label: string; color: string }[] = [
  { value: 'facil', label: 'Fácil', color: AndeanTheme.colors.primaryDark },
  { value: 'moderado', label: 'Moderado', color: AndeanTheme.colors.amber },
  { value: 'dificil', label: 'Difícil', color: AndeanTheme.colors.difficultyHard },
  { value: 'experto', label: 'Experto', color: AndeanTheme.colors.danger },
];

export const PlanEditorView: React.FC<PlanEditorViewProps> = ({ onContinue }) => {
  const plan = usePlanStore((s) => s.plan);
  const { saving, updatePlan, setPoints, setPlanMeta } = usePlanStore();

  const [title, setTitle] = useState(plan?.title ?? '');
  const [difficulty, setDifficulty] = useState<RouteDifficulty>(plan?.difficulty ?? 'moderado');
  const [start, setStart] = useState<PlannedPoint | null>(plan?.startPoint ?? null);
  const [end, setEnd] = useState<PlannedPoint | null>(plan?.endPoint ?? null);
  const [savedOk, setSavedOk] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async () => {
    setLocalError(null);
    setSavedOk(false);
    if (!start || !end) {
      setLocalError('La planificación debe tener punto inicial y destino.');
      return;
    }
    setPlanMeta({ title: title.trim() ? title.trim() : 'Borrador sin título', difficulty });
    const pointsOk = await setPoints(start, end);
    if (!pointsOk) return;
    const ok = await updatePlan();
    if (ok) {
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    }
  };

  const canContinue = start !== null && end !== null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>NOMBRE PROVISIONAL DE LA RUTA</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Circo del Valle de la Luna"
          placeholderTextColor={AndeanTheme.colors.fieldHint}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>DIFICULTAD ESTIMADA</Text>
        <View style={styles.chips}>
          {DIFFICULTIES.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => setDifficulty(d.value)}
              style={[styles.chip, difficulty === d.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, difficulty === d.value && { color: d.color }]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>PUNTOS DE LA RUTA</Text>
      <PlanPointPicker start={start} end={end} onStartChange={setStart} onEndChange={setEnd} height={260} />

      <View style={styles.confirmBadge}>
        <Pin size={14} color={plan?.startPointConfirmed ? AndeanTheme.colors.primaryDark : AndeanTheme.colors.fieldIcon} />
        <Text style={[styles.confirmText, plan?.startPointConfirmed && styles.confirmTextOn]}>
          {plan?.startPointConfirmed
            ? 'Punto inicial real confirmado'
            : 'Punto inicial aún sin confirmar'}
        </Text>
      </View>

      {localError && <Text style={styles.error}>{localError}</Text>}
      {savedOk && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={14} color={AndeanTheme.colors.primaryDark} />
          <Text style={styles.successText}>Cambios guardados correctamente.</Text>
        </View>
      )}

      <Button
        title="GUARDAR CAMBIOS"
        onPress={handleSave}
        loading={saving}
        icon={<Save size={15} color={AndeanTheme.colors.white} />}
      />

      <Button
        title="CONTINUAR: CONFIRMAR PUNTO DE INICIO"
        variant="outline-green"
        onPress={onContinue}
        disabled={!canContinue}
        icon={<ChevronRight size={15} color={AndeanTheme.colors.primaryDark} />}
      />
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: AndeanTheme.colors.fieldHint,
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
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: AndeanTheme.colors.successBg,
    borderColor: AndeanTheme.colors.successBorder,
  },
  chipText: { fontSize: 11, fontWeight: '700', color: AndeanTheme.colors.inkSecondary },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 10,
  },
  confirmText: { color: AndeanTheme.colors.inkSecondary, fontSize: 11, fontWeight: '700' },
  confirmTextOn: { color: AndeanTheme.colors.ink },
  error: { color: AndeanTheme.colors.errorText, fontSize: 11 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.successBg,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.successBorder,
    borderRadius: 12,
    padding: 10,
  },
  successText: { color: AndeanTheme.colors.successText, fontSize: 11 },
});