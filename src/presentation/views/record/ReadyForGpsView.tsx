import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { CheckCircle2, MapPin, Flag, Gauge, Route as RouteIcon, Play } from 'lucide-react-native';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';

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

export const ReadyForGpsView: React.FC<ReadyForGpsViewProps> = ({ onDone, onStartRecording }) => {
  const plan = usePlanStore((s) => s.plan);

  if (!plan) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <CheckCircle2 size={30} color="#064E3B" />
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
          <MapPin size={14} color="#10B981" />
          <Text style={styles.rowLabel}>Punto inicial (confirmado)</Text>
          <Text style={styles.rowValue}>
            {plan.startPoint ? `${plan.startPoint.lat.toFixed(5)}, ${plan.startPoint.lng.toFixed(5)}` : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Flag size={14} color="#F59E0B" />
          <Text style={styles.rowLabel}>Destino</Text>
          <Text style={styles.rowValue}>
            {plan.endPoint ? `${plan.endPoint.lat.toFixed(5)}, ${plan.endPoint.lng.toFixed(5)}` : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Gauge size={14} color="#34D399" />
          <Text style={styles.rowLabel}>Dificultad estimada</Text>
          <Text style={styles.rowValue}>{DIFFICULTY_LABEL[plan.difficulty] ?? plan.difficulty}</Text>
        </View>

        <View style={styles.readyFlag}>
          <RouteIcon size={14} color="#10B981" />
          <Text style={styles.readyFlagText}>START_POINT CONFIRMADO · READY_FOR_GPS</Text>
        </View>
      </View>

      {onStartRecording ? (
        <View style={styles.btnGroup}>
          <Pressable
            onPress={onStartRecording}
            style={({ pressed }) => [styles.startGpsBtn, pressed && styles.pressed]}
          >
            <Play size={16} color="#064E3B" fill="#064E3B" />
            <Text style={styles.startGpsBtnText}>INICIAR RUTA CON GPS</Text>
          </Pressable>

          <Pressable
            onPress={onDone}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnText}>GUARDAR Y SALIR</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
        >
          <Text style={styles.doneBtnText}>FINALIZAR</Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '900' },
  heroText: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', lineHeight: 17, maxWidth: 300 },
  summaryCard: {
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '900' },
  summaryStatus: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { color: '#9CA3AF', fontSize: 11, flex: 1 },
  rowValue: { color: '#D1D5DB', fontSize: 11, fontWeight: '700' },
  readyFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  readyFlagText: { color: '#34D399', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  btnGroup: { gap: 10 },
  startGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 15,
  },
  startGpsBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#064E3B',
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 14,
    paddingVertical: 13,
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.6,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: '#064E3B' },
  pressed: { opacity: 0.8 },
});