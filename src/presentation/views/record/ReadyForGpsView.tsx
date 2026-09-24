import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CheckCircle2, MapPin, Flag, Gauge, Route as RouteIcon, Play } from 'lucide-react-native';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import { Button } from '../../components/ui';
import { AndeanTheme } from '../../theme';

/**
 * HU-07 T10 — Resumen "lista para grabar con GPS".
 * Confirma que la planificación está completa y deja la ruta lista para
 * la grabación (handoff a HU-08).
 */
interface ReadyForGpsViewProps {
  onDone: () => void;
  onStartRecording?: () => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  facil: 'Fácil',
  moderado: 'Moderado',
  dificil: 'Difícil',
  experto: 'Experto',
};

export const ReadyForGpsView: React.FC<ReadyForGpsViewProps> = ({
  onDone,
  onStartRecording,
}) => {
  const plan = usePlanStore((s) => s.plan);

  if (!plan) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <CheckCircle2 size={28} color={AndeanTheme.colors.white} />
        </View>
        <Text style={styles.heroTitle}>¡Ruta lista para grabar!</Text>
        <Text style={styles.heroText}>
          Tu planificación quedó preparada para iniciar la grabación GPS de la ruta (HU-08).
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{plan.title || 'Borrador sin título'}</Text>
        <Text style={styles.summaryStatus}>ESTADO: LISTA PARA GRABAR</Text>

        <View style={styles.row}>
          <MapPin size={14} color={AndeanTheme.colors.fieldIcon} />
          <Text style={styles.rowLabel}>Punto inicial (confirmado)</Text>
          <Text style={styles.rowValue}>
            {plan.startPoint ? `${plan.startPoint.lat.toFixed(5)}, ${plan.startPoint.lng.toFixed(5)}` : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Flag size={14} color={AndeanTheme.colors.amber} />
          <Text style={styles.rowLabel}>Destino</Text>
          <Text style={styles.rowValue}>
            {plan.endPoint ? `${plan.endPoint.lat.toFixed(5)}, ${plan.endPoint.lng.toFixed(5)}` : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Gauge size={14} color={AndeanTheme.colors.fieldIcon} />
          <Text style={styles.rowLabel}>Dificultad estimada</Text>
          <Text style={styles.rowValue}>{DIFFICULTY_LABEL[plan.difficulty] ?? plan.difficulty}</Text>
        </View>

        <View style={styles.readyFlag}>
          <RouteIcon size={14} color={AndeanTheme.colors.primaryDark} />
          <Text style={styles.readyFlagText}>START_POINT CONFIRMADO · READY_FOR_GPS</Text>
        </View>
      </View>

      {onStartRecording ? (
        <View style={styles.btnGroup}>
          <Button
            title="INICIAR RUTA CON GPS"
            onPress={onStartRecording}
            icon={
              <Play size={16} color={AndeanTheme.colors.white} fill={AndeanTheme.colors.white} />
            }
            accessibilityLabel="Iniciar ruta con GPS"
          />
          <Button
            title="GUARDAR Y SALIR"
            variant="outline-muted"
            onPress={onDone}
            accessibilityLabel="Guardar y salir"
          />
        </View>
      ) : (
        <Button title="FINALIZAR" onPress={onDone} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AndeanTheme.colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: AndeanTheme.colors.ink, fontSize: 18, fontWeight: '900' },
  heroText: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, textAlign: 'center', lineHeight: 17, maxWidth: 300 },
  summaryCard: {
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryTitle: { color: AndeanTheme.colors.ink, fontSize: 16, fontWeight: '900' },
  summaryStatus: {
    color: AndeanTheme.colors.fieldHint,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { color: AndeanTheme.colors.inkSecondary, fontSize: 11, flex: 1 },
  rowValue: { color: AndeanTheme.colors.ink, fontSize: 11, fontWeight: '700' },
  readyFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  readyFlagText: { color: AndeanTheme.colors.inkSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  btnGroup: { gap: 10 },
});