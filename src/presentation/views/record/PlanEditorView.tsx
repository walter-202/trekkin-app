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

/**
 * HU-07 T7 — Modificar la planificación antes de iniciar la ruta.
 * Permite editar título, dificultad y los puntos provisionales.
 */
interface PlanEditorViewProps {
  onContinue: () => void;
}

const DIFFICULTIES: { value: RouteDifficulty; label: string; color: string }[] = [
  { value: 'facil', label: 'Fácil', color: '#34D399' },
  { value: 'moderado', label: 'Moderado', color: '#F59E0B' },
  { value: 'dificil', label: 'Difícil', color: '#F97316' },
  { value: 'experto', label: 'Experto', color: '#EF4444' },
];

export const PlanEditorView: React.FC<PlanEditorViewProps> = ({ onContinue }) => {
  const plan = usePlanStore((s) => s.plan);
  const { saving, updatePlan, setPoints, setPlanMeta, addWaypoint, removeWaypoint, moveWaypoint, undo, clearWaypoints, canUndo, history } = usePlanStore();

  const [title, setTitle] = useState(plan?.title ?? '');
  const [difficulty, setDifficulty] = useState<RouteDifficulty>(plan?.difficulty ?? 'moderado');
  const [start, setStart] = useState<PlannedPoint | null>(plan?.startPoint ?? null);
  const [end, setEnd] = useState<PlannedPoint | null>(plan?.endPoint ?? null);
  const [savedOk, setSavedOk] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const waypoints = plan?.waypoints ?? [];
  const isUndoAvailable = history.length > 0;

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
          placeholderTextColor="#6B7280"
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
                difficulty === d.value && { borderColor: d.color, backgroundColor: '#0A241C' },
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
      <PlanPointPicker
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        height={260}
        waypoints={waypoints}
        onAddWaypoint={addWaypoint}
        onRemoveWaypoint={removeWaypoint}
        onWaypointDrag={moveWaypoint}
        onUndo={undo}
        onClearWaypoints={clearWaypoints}
        canUndo={isUndoAvailable}
      />

      <View style={styles.confirmBadge}>
        <Pin size={14} color={plan?.startPointConfirmed ? '#34D399' : '#9CA3AF'} />
        <Text style={[styles.confirmText, plan?.startPointConfirmed && styles.confirmTextOn]}>
          {plan?.startPointConfirmed
            ? 'Punto inicial real confirmado'
            : 'Punto inicial aún sin confirmar'}
        </Text>
      </View>

      {localError && <Text style={styles.error}>{localError}</Text>}
      {savedOk && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={14} color="#34D399" />
          <Text style={styles.successText}>Cambios guardados correctamente.</Text>
        </View>
      )}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Save size={15} color="#FFFFFF" />
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
        <ChevronRight size={15} color="#F9FAFB" />
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
    color: '#9CA3AF',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F9FAFB',
    fontSize: 13,
  },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    padding: 10,
  },
  confirmText: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },
  confirmTextOn: { color: '#34D399' },
  error: { color: '#FCA5A5', fontSize: 11 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 10,
  },
  successText: { color: '#6EE7B7', fontSize: 11 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: '#FFFFFF' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 12, fontWeight: '800', color: '#F9FAFB' },
  pressed: { opacity: 0.8 },
});