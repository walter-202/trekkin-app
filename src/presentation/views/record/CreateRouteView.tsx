import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Save } from 'lucide-react-native';
import { PlanPointPicker } from '../../components/plan/PlanPointPicker';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import type { PlannedPoint } from '../../../core/domain/plan';

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
  const [modality, setModality] = useState<'trekking' | 'alta' | 'mtb'>('trekking');

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
      <View style={styles.stepper}>
        <View style={styles.stepperRow}>
          <View style={[styles.stepItem, styles.stepActive]}>
            <Text style={styles.stepNumActive}>1</Text>
            <Text style={styles.stepLabelActive}>Datos & Ruta</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>2</Text>
            <Text style={styles.stepLabel}>Equipamiento</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>3</Text>
            <Text style={styles.stepLabel}>Trazado GPS</Text>
          </View>
        </View>
        <Text style={styles.stepHint}>Paso 1 de 3: Ficha & Descripción</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.microLabel}>NOMBRE PROVISIONAL DE LA RUTA *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Ruta del Diablo / Camino de la Muerte"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.microLabel}>MODALIDAD (VISUAL)</Text>
        <View style={styles.modalityRow}>
          {[
            { id: 'trekking', label: 'Trekking' },
            { id: 'alta', label: 'Alta Montaña' },
            { id: 'mtb', label: 'MTB Enduro' },
          ].map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setModality(m.id as any)}
              style={[styles.modalityChip, modality === m.id && styles.modalityChipActive]}
            >
              <Text style={[styles.modalityText, modality === m.id && styles.modalityTextActive]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
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
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Save size={15} color="#FFFFFF" />
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
  help: { color: '#9CA3AF', fontSize: 12, lineHeight: 17 },
  helpStart: { color: '#34D399', fontWeight: '800' },
  helpEnd: { color: '#F59E0B', fontWeight: '800' },
  error: { color: '#FCA5A5', fontSize: 11 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveBtnDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  saveBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: '#FFFFFF' },
  note: { color: '#6B7280', fontSize: 11, textAlign: 'center' },
  stepper: {
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.5 },
  stepActive: { opacity: 1 },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1A4537',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
  },
  stepNumActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    color: '#064E3B',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
  },
  stepLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '700' },
  stepLabelActive: { color: '#F9FAFB', fontSize: 10, fontWeight: '800' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#1A4537', marginHorizontal: 6 },
  stepHint: { color: '#6EE7B7', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  modalityRow: { flexDirection: 'row', gap: 8 },
  modalityChip: {
    flex: 1,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalityChipActive: { borderColor: '#10B981', backgroundColor: '#0A241C' },
  modalityText: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },
  modalityTextActive: { color: '#34D399', fontWeight: '800' },
});