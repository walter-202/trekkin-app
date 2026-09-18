import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Save, CheckCircle2, ChevronRight, Pin } from 'lucide-react-native';
import { PlanPointPicker } from '../../components/plan/PlanPointPicker';
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
  { value: 'facil', label: 'Fácil', color: AndeanTheme.colors.primaryLight },
  { value: 'moderado', label: 'Moderado', color: AndeanTheme.colors.accentWarning },
  { value: 'dificil', label: 'Difícil', color: '#F97316' },
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
        <Text style={styles.microLabel}>NOMBRE PROVISIONAL DE LA RUTA</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Circo del Valle de la Luna"
          placeholderTextColor={AndeanTheme.colors.textMuted}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.microLabel}>DIFICULTAD ESTIMADA</Text>
        <View style={styles.chips}>
          {DIFFICULTIES.map((d) => (
            <Pressable
              key={d.value}
              onPress={() => setDifficulty(d.value)}
              style={[
                styles.chip,
                difficulty === d.value && { borderColor: d.color, backgroundColor: AndeanTheme.colors.cardElevated },
              ]}
            >
              <Text style={[styles.chipText, difficulty === d.value && { color: d.color }]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.microLabel}>PUNTOS DE LA RUTA</Text>
      <PlanPointPicker start={start} end={end} onStartChange={setStart} onEndChange={setEnd} height={260} />

      <View style={styles.confirmBadge}>
        <Pin size={14} color={plan?.startPointConfirmed ? AndeanTheme.colors.primary : AndeanTheme.colors.textSecondary} />
        <Text style={[styles.confirmText, plan?.startPointConfirmed && styles.confirmTextOn]}>
          {plan?.startPointConfirmed
            ? 'Punto inicial real confirmado'
            : 'Punto inicial aún sin confirmar'}
        </Text>
      </View>

      {localError && <Text style={styles.error}>{localError}</Text>}
      {savedOk && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={14} color={AndeanTheme.colors.primary} />
          <Text style={styles.successText}>Cambios guardados correctamente.</Text>
        </View>
      )}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
      >
        {saving ? (
          <ActivityIndicator color="#064E3B" size="small" />
        ) : (
          <>
            <Save size={15} color="#064E3B" />
            <Text style={styles.saveBtnText}>GUARDAR CAMBIOS</Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={onContinue}
        disabled={!canContinue}
        style={({ pressed }) => [
          styles.continueBtn,
          pressed && styles.pressed,
          !canContinue && styles.continueBtnDisabled,
        ]}
      >
        <Text style={styles.continueBtnText}>CONTINUAR: CONFIRMAR PUNTO DE INICIO</Text>
        <ChevronRight size={15} color={AndeanTheme.colors.text} />
      </Pressable>
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
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 11, fontWeight: '700', color: AndeanTheme.colors.textSecondary },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 10,
  },
  confirmText: { color: AndeanTheme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
  confirmTextOn: { color: AndeanTheme.colors.text },
  error: { color: AndeanTheme.colors.danger, fontSize: 11 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 12,
    padding: 10,
  },
  successText: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: '#064E3B' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: 14,
    paddingVertical: 14,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 12, fontWeight: '800', color: AndeanTheme.colors.text },
  pressed: { opacity: 0.8 },
});