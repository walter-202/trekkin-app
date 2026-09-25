import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Save } from 'lucide-react-native';
import { PlanPointPicker } from '../../components/plan/PlanPointPicker';
import { Button } from '../../components/ui';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import type { PlannedPoint } from '../../../core/domain/plan';
import type { RouteWeather, TerrainType } from '../../../core/domain/types';
import { AndeanTheme } from '../../theme';

const TERRAIN_OPTIONS: Array<{ value: TerrainType; label: string }> = [
  { value: 'asfalto', label: 'Asfalto' },
  { value: 'sendero', label: 'Sendero' },
  { value: 'piedra', label: 'Piedra' },
  { value: 'arena', label: 'Arena' },
  { value: 'roca', label: 'Roca' },
  { value: 'mixto', label: 'Mixto' },
];

const WEATHER_OPTIONS: Array<{ value: RouteWeather; label: string }> = [
  { value: 'soleado', label: 'Soleado' },
  { value: 'nublado', label: 'Nublado' },
  { value: 'lluvia', label: 'Lluvia' },
  { value: 'viento', label: 'Viento' },
  { value: 'nevado', label: 'Nevado' },
  { value: 'caliente', label: 'Caliente' },
];

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
  const [terrainType, setTerrainType] = useState<TerrainType | undefined>(
    plan?.terrainType ?? undefined,
  );
  const [weather, setWeather] = useState<RouteWeather | undefined>(
    plan?.weather ?? undefined,
  );
  const [notes, setNotes] = useState(plan?.notes ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const canSubmit = useMemo(() => Boolean(start && end), [start, end]);

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

    setPlanMeta({
      title: name,
      terrainType,
      weather,
      notes: notes.trim(),
    });

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

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>TIPO DE TERRENO</Text>
        <View style={styles.chipRow}>
          {TERRAIN_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setTerrainType(option.value)}
              style={[
                styles.chip,
                terrainType === option.value && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  terrainType === option.value && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>CLIMA</Text>
        <View style={styles.chipRow}>
          {WEATHER_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setWeather(option.value)}
              style={[
                styles.chip,
                weather === option.value && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  weather === option.value && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>NOTAS DE LA RUTA</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Ej. Sendero pedregoso, desnivel fuerte, paso con viento..."
          placeholderTextColor={AndeanTheme.colors.fieldHint}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
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
        disabled={!canSubmit}
        icon={<Save size={15} color={AndeanTheme.colors.white} />}
      />

      <Text style={styles.note}>
        Al guardar quedará en "Mis borradores" y podrás retomarlo con dificultad, tipo de terreno, clima y notas incluidos.
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
  textArea: {
    minHeight: 96,
    paddingTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: AndeanTheme.colors.successBg,
    borderColor: AndeanTheme.colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: AndeanTheme.colors.inkSecondary,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: AndeanTheme.colors.primaryDark,
  },
  help: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, lineHeight: 17 },
  helpStart: { color: AndeanTheme.colors.primaryDark, fontWeight: '800' },
  helpEnd: { color: AndeanTheme.colors.amber, fontWeight: '800' },
  error: { color: AndeanTheme.colors.errorText, fontSize: 11 },
  note: { color: AndeanTheme.colors.fieldHint, fontSize: 11, textAlign: 'center' },
});