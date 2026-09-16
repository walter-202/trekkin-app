import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  CheckCircle2,
  Clock,
  Navigation,
  Gauge,
  MapPin,
  Save,
  Trash2,
  Radio,
  Route as RouteIcon,
} from 'lucide-react-native';
import { PlanMap } from '../../components/map/PlanMap';
import { useActivityStore } from '../../../infrastructure/persistence/useActivityStore';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import { routeService } from '../../../infrastructure/database/routeService';
import {
  calculatePaceMinPerKm,
  calculateAverageSpeedKmh,
  suggestRouteDifficulty,
  accumulatedDistanceKm,
} from '../../../core/domain/calculations';
import { activeElapsedMs } from '../../../core/domain/activity';
import { formatDuration, formatPace } from '../../utils/format';
import type { RouteDifficulty } from '../../../core/domain/types';

interface ActivitySummaryViewProps {
  onDone: () => void;
}

const DIFFICULTY_LABEL: Record<RouteDifficulty, { label: string; color: string }> = {
  facil: { label: 'Fácil', color: '#34D399' },
  moderado: { label: 'Moderado', color: '#F59E0B' },
  dificil: { label: 'Difícil', color: '#F97316' },
  experto: { label: 'Experto', color: '#EF4444' },
};

export const ActivitySummaryView: React.FC<ActivitySummaryViewProps> = ({ onDone }) => {
  const plan = usePlanStore((s) => s.plan);
  const live = useActivityStore((s) => s.live);
  const lastResult = useActivityStore((s) => s.lastResult);
  const clearLive = useActivityStore((s) => s.clearLive);

  const [savingRoute, setSavingRoute] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!live && !lastResult) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No hay actividad para mostrar.</Text>
        <Pressable onPress={onDone} style={styles.backBtn}>
          <Text style={styles.backBtnText}>VOLVER</Text>
        </Pressable>
      </View>
    );
  }

  const recordedPoints = lastResult?.recordedPoints ?? live?.recordedPoints ?? [];
  const checkpoints = live?.newCheckpoints ?? [];
  const distanceKm = lastResult?.distanceCoveredKm ?? accumulatedDistanceKm(recordedPoints);
  const durationSec =
    lastResult?.durationSeconds ?? (live ? Math.round(activeElapsedMs(live) / 1000) : 0);
  const pace = calculatePaceMinPerKm(distanceKm, durationSec);
  const speed = calculateAverageSpeedKmh(distanceKm, durationSec);
  const finalDifficulty: RouteDifficulty = suggestRouteDifficulty(distanceKm);

  const handleSaveRoute = async () => {
    setSavingRoute(true);
    try {
      if (plan?.id) {
        // Actualiza el borrador existente de la ruta en Firestore
        // Decisión 4: El estado al finalizar una ruta creada por usuario es 'in_review'
        await routeService.updateRoute(plan.id, {
          distanceKm,
          durationMinutes: Math.max(1, Math.round(durationSec / 60)),
          waypoints: recordedPoints,
          checkpoints: checkpoints,
          difficulty: finalDifficulty,
          status: 'in_review',
          updatedAt: Date.now(),
        });
      }

      setSavedSuccess(true);
      setTimeout(async () => {
        await clearLive();
        await usePlanStore.getState().clearPlan();
        onDone();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la ruta.';
      Alert.alert('Aviso', `La actividad quedó guardada en tu perfil. ${msg}`);
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      '¿Descartar recorrido?',
      'Esta acción eliminará el registro de la actividad en curso.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            await clearLive();
            onDone();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER DE FELICITACIONES */}
      <View style={styles.hero}>
        <View style={styles.checkCircle}>
          <CheckCircle2 size={32} color="#064E3B" />
        </View>
        <Text style={styles.heroTitle}>¡Recorrido finalizado!</Text>
        <Text style={styles.heroText}>
          Tu actividad GPS fue grabada con éxito. Revisa el resumen antes de guardar tu ruta.
        </Text>
      </View>

      {/* MAPA RESUMEN */}
      <View style={styles.mapWrap}>
        <PlanMap
          trail={recordedPoints}
          pointsOfInterest={checkpoints}
          start={plan?.startPoint}
          end={plan?.endPoint}
          height={240}
        />
      </View>

      {/* TARJETA CON MÉTRICAS PRINCIPALES */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {plan?.title ? plan.title : 'Recorrido GPS registrado'}
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCell}>
            <Navigation size={14} color="#10B981" />
            <Text style={styles.metricLabel}>DISTANCIA</Text>
            <Text style={styles.metricVal}>{distanceKm.toFixed(2)} km</Text>
          </View>

          <View style={styles.metricCell}>
            <Clock size={14} color="#34D399" />
            <Text style={styles.metricLabel}>DURACIÓN</Text>
            <Text style={styles.metricVal}>{formatDuration(durationSec)}</Text>
          </View>

          <View style={styles.metricCell}>
            <Gauge size={14} color="#6EE7B7" />
            <Text style={styles.metricLabel}>RITMO MEDIO</Text>
            <Text style={styles.metricVal}>{formatPace(pace)}</Text>
          </View>

          <View style={styles.metricCell}>
            <RouteIcon size={14} color="#FBBF24" />
            <Text style={styles.metricLabel}>VELOCIDAD</Text>
            <Text style={styles.metricVal}>{speed.toFixed(1)} km/h</Text>
          </View>

          <View style={styles.metricCell}>
            <Radio size={14} color="#9CA3AF" />
            <Text style={styles.metricLabel}>PUNTOS GPS</Text>
            <Text style={styles.metricVal}>{recordedPoints.length}</Text>
          </View>

          <View style={styles.metricCell}>
            <MapPin size={14} color="#F472B6" />
            <Text style={styles.metricLabel}>PARADAS</Text>
            <Text style={styles.metricVal}>{checkpoints.length}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* DIFICULTAD SUGERIDA */}
        <View style={styles.difficultyRow}>
          <Text style={styles.diffLabel}>DIFICULTAD SUGERIDA:</Text>
          <View
            style={[
              styles.diffBadge,
              { borderColor: DIFFICULTY_LABEL[finalDifficulty].color },
            ]}
          >
            <Text
              style={[
                styles.diffBadgeText,
                { color: DIFFICULTY_LABEL[finalDifficulty].color },
              ]}
            >
              {DIFFICULTY_LABEL[finalDifficulty].label.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {savedSuccess && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={16} color="#34D399" />
          <Text style={styles.successText}>
            ¡Ruta guardada y enviada a revisión (in_review)!
          </Text>
        </View>
      )}

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleSaveRoute}
          disabled={savingRoute || savedSuccess}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.pressed,
            (savingRoute || savedSuccess) && styles.btnDisabled,
          ]}
        >
          {savingRoute ? (
            <ActivityIndicator color="#064E3B" size="small" />
          ) : (
            <>
              <Save size={16} color="#064E3B" />
              <Text style={styles.saveBtnText}>GUARDAR Y ENVIAR A REVISIÓN</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleDiscard}
          disabled={savingRoute || savedSuccess}
          style={({ pressed }) => [styles.discardBtn, pressed && styles.pressed]}
        >
          <Trash2 size={15} color="#EF4444" />
          <Text style={styles.discardBtnText}>DESCARTAR RECORRIDO</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#051712' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: '#9CA3AF', fontSize: 13 },
  backBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { color: '#064E3B', fontWeight: '800', fontSize: 12 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '900' },
  heroText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 300,
  },
  mapWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '900',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCell: {
    width: '47%',
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricVal: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '800',
  },
  divider: { height: 1, backgroundColor: '#1A4537' },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diffLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '800' },
  diffBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#0A241C',
  },
  diffBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 12,
  },
  successText: { color: '#6EE7B7', fontSize: 12, fontWeight: '800' },
  actions: { gap: 10, marginTop: 6 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#064E3B',
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 13,
  },
  discardBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#EF4444',
  },
  btnDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
