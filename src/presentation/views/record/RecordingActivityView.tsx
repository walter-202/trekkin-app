import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Play,
  Pause,
  MapPin,
  CheckCircle2,
  Navigation,
  Clock,
  Gauge,
  Flag,
  Radio,
  AlertTriangle,
  X,
} from 'lucide-react-native';
import { PlanMap } from '../../components/map/PlanMap';
import { useActivityStore } from '../../../infrastructure/persistence/useActivityStore';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import {
  calculatePaceMinPerKm,
  calculateAverageSpeedKmh,
  accumulatedDistanceKm,
  remainingDistanceToEndKm,
} from '../../../core/domain/calculations';
import { activeElapsedMs, ACTIVITY_CONFIG } from '../../../core/domain/activity';
import { formatDuration, formatPace } from '../../utils/format';
import type { CheckpointCategory } from '../../../core/domain/types';
import type { PlannedPoint } from '../../../core/domain/plan';

interface RecordingActivityViewProps {
  onFinished: () => void;
  onCancel?: () => void;
}

const CATEGORIES: { value: CheckpointCategory; label: string; iconColor: string }[] = [
  { value: 'vista', label: 'Mirador / Vista', iconColor: '#34D399' },
  { value: 'agua', label: 'Punto de Agua', iconColor: '#60A5FA' },
  { value: 'descanso', label: 'Descanso', iconColor: '#FBBF24' },
  { value: 'camping', label: 'Camping', iconColor: '#A78BFA' },
  { value: 'peligro', label: 'Peligro', iconColor: '#F87171' },
  { value: 'refugio', label: 'Refugio', iconColor: '#F472B6' },
  { value: 'flora_fauna', label: 'Flora / Fauna', iconColor: '#34D399' },
];

export const RecordingActivityView: React.FC<RecordingActivityViewProps> = ({
  onFinished,
  onCancel,
}) => {
  const plan = usePlanStore((s) => s.plan);
  const live = useActivityStore((s) => s.live);
  const gpsError = useActivityStore((s) => s.error);
  const finishing = useActivityStore((s) => s.finishing);

  const pauseActivity = useActivityStore((s) => s.pauseActivity);
  const resumeActivity = useActivityStore((s) => s.resumeActivity);
  const addCheckpoint = useActivityStore((s) => s.addCheckpoint);
  const finishActivity = useActivityStore((s) => s.finishActivity);
  const startWatch = useActivityStore((s) => s.startWatch);

  const [, setTick] = useState(0);
  const [checkpointModalVisible, setCheckpointModalVisible] = useState(false);
  const [cpName, setCpName] = useState('');
  const [cpCategory, setCpCategory] = useState<CheckpointCategory>('vista');
  const [cpNotes, setCpNotes] = useState('');
  const [addingCheckpoint, setAddingCheckpoint] = useState(false);
  const [savingCheckpointSuccess, setSavingCheckpointSuccess] = useState(false);

  // Intervalo de 1s para refrescar métricas de tiempo transcurrido
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Asegurar seguimiento GPS si la actividad está en curso
  useEffect(() => {
    const current = useActivityStore.getState().live;
    if (current && current.phase === 'in_progress') {
      useActivityStore.getState().startWatch();
    }
    return () => {
      useActivityStore.getState().stopWatch();
    };
  }, []);

  const isPaused = live?.phase === 'paused';
  const recordedPoints = live?.recordedPoints ?? [];
  const lastPoint = recordedPoints[recordedPoints.length - 1];
  const currentPosition: PlannedPoint | undefined = lastPoint
    ? { lat: lastPoint.lat, lng: lastPoint.lng, name: 'Mi ubicación' }
    : plan?.startPoint
      ? { lat: plan.startPoint.lat, lng: plan.startPoint.lng, name: 'Punto de inicio' }
      : undefined;

  const distanceCoveredKm = accumulatedDistanceKm(recordedPoints, {
    minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
    maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
  });
  const durationSeconds = live ? Math.round(activeElapsedMs(live) / 1000) : 0;
  const checkpoints = live?.newCheckpoints ?? [];

  const routePolyline = [
    ...(live?.route.waypoints ?? plan?.waypoints ?? []),
    ...(live?.route.endPoint ? [live.route.endPoint] : plan?.endPoint ? [plan.endPoint] : []),
  ];
  const remainingDistanceKm =
    lastPoint && routePolyline.length > 0
      ? remainingDistanceToEndKm(lastPoint, routePolyline)
      : 0;

  const pace = calculatePaceMinPerKm(distanceCoveredKm, durationSeconds);
  const speed = calculateAverageSpeedKmh(distanceCoveredKm, durationSeconds);

  const handleTogglePause = async () => {
    if (isPaused) {
      const ok = await resumeActivity();
      if (ok) {
        await startWatch();
      }
    } else {
      await pauseActivity();
    }
  };

  const handleOpenCheckpointModal = () => {
    setCpName('');
    setCpNotes('');
    setCpCategory('vista');
    setCheckpointModalVisible(true);
  };

  const handleSaveCheckpoint = async () => {
    if (!cpName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para la parada.');
      return;
    }
    setAddingCheckpoint(true);
    const cpLat = lastPoint?.lat ?? plan?.startPoint?.lat ?? 0;
    const cpLng = lastPoint?.lng ?? plan?.startPoint?.lng ?? 0;
    const ok = await addCheckpoint({
      name: cpName.trim(),
      category: cpCategory,
      lat: cpLat,
      lng: cpLng,
      notes: cpNotes.trim() ? cpNotes.trim() : undefined,
    });
    setAddingCheckpoint(false);

    if (ok) {
      setCheckpointModalVisible(false);
      setSavingCheckpointSuccess(true);
      setTimeout(() => setSavingCheckpointSuccess(false), 2500);
    } else {
      Alert.alert('Error', gpsError ?? 'No se pudo guardar la parada.');
    }
  };

  const handleConfirmFinish = () => {
    Alert.alert(
      '¿Finalizar ruta?',
      'Se detendrá la grabación GPS y se consolidarán las métricas de tu recorrido.',
      [
        { text: 'Continuar grabando', style: 'cancel' },
        {
          text: 'Finalizar recorrido',
          style: 'destructive',
          onPress: async () => {
            const result = await finishActivity();
            if (result) {
              onFinished();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* MAPA PRINCIPAL */}
      <View style={styles.mapContainer}>
        <PlanMap
          trail={recordedPoints}
          currentLocation={
            currentPosition
              ? { lat: currentPosition.lat, lng: currentPosition.lng, name: 'Mi ubicación' }
              : null
          }
          start={plan?.startPoint}
          end={plan?.endPoint}
          pointsOfInterest={checkpoints}
          height={300}
        />

        {/* BADGE DE ESTADO GPS FLOTANTE SOBRE EL MAPA */}
        <View style={styles.floatingGpsBar}>
          <View style={styles.gpsStatusRow}>
            {isPaused ? (
              <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
            ) : gpsError ? (
              <AlertTriangle size={12} color="#EF4444" />
            ) : (
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            )}
            <Text style={styles.gpsStatusText}>
              {isPaused
                ? 'PAUSADO'
                : gpsError
                ? 'ERROR GPS'
                : `GPS ACTIVO · ${recordedPoints.length} PTS`}
            </Text>
          </View>
          {checkpoints.length > 0 && (
            <View style={styles.checkpointBadge}>
              <MapPin size={11} color="#34D399" />
              <Text style={styles.checkpointBadgeText}>{checkpoints.length} paradas</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.hudScroll} contentContainerStyle={styles.hudContent}>
        {savingCheckpointSuccess && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={14} color="#34D399" />
            <Text style={styles.successText}>¡Parada registrada correctamente!</Text>
          </View>
        )}

        {gpsError && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={14} color="#FCA5A5" />
            <Text style={styles.errorText}>{gpsError}</Text>
          </View>
        )}

        {/* HUD DE MÉTRICAS */}
        <View style={styles.hudCard}>
          <View style={styles.hudRow}>
            <View style={styles.hudMetric}>
              <View style={styles.metricLabelRow}>
                <Clock size={12} color="#9CA3AF" />
                <Text style={styles.metricLabel}>TIEMPO</Text>
              </View>
              <Text style={styles.metricValueLarge}>{formatDuration(durationSeconds)}</Text>
            </View>

            <View style={styles.hudMetric}>
              <View style={styles.metricLabelRow}>
                <Navigation size={12} color="#10B981" />
                <Text style={styles.metricLabel}>DISTANCIA</Text>
              </View>
              <Text style={styles.metricValueLarge}>{distanceCoveredKm.toFixed(2)} km</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.hudRowSecondary}>
            <View style={styles.hudMetricSecondary}>
              <Text style={styles.metricLabelSecondary}>RITMO</Text>
              <Text style={styles.metricValueSecondary}>{formatPace(pace)}</Text>
            </View>
            <View style={styles.hudMetricSecondary}>
              <Text style={styles.metricLabelSecondary}>VELOCIDAD</Text>
              <Text style={styles.metricValueSecondary}>{speed.toFixed(1)} km/h</Text>
            </View>
            {plan?.endPoint && remainingDistanceKm > 0 && (
              <View style={styles.hudMetricSecondary}>
                <Text style={styles.metricLabelSecondary}>RESTANTE</Text>
                <Text style={styles.metricValueSecondary}>
                  {remainingDistanceKm.toFixed(2)} km
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* CONTROLES INFERIORES */}
        <View style={styles.controlsGroup}>
          <Pressable
            onPress={handleOpenCheckpointModal}
            disabled={isPaused}
            style={({ pressed }) => [
              styles.checkpointBtn,
              pressed && styles.pressed,
              isPaused && styles.btnDisabled,
            ]}
          >
            <MapPin size={16} color="#34D399" />
            <Text style={styles.checkpointBtnText}>AÑADIR PARADA</Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleTogglePause}
              style={({ pressed }) => [
                styles.pauseBtn,
                isPaused ? styles.resumeBtn : styles.pauseBtnActive,
                pressed && styles.pressed,
              ]}
            >
              {isPaused ? (
                <>
                  <Play size={18} color="#064E3B" fill="#064E3B" />
                  <Text style={styles.resumeBtnText}>REANUDAR</Text>
                </>
              ) : (
                <>
                  <Pause size={18} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.pauseBtnText}>PAUSAR</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleConfirmFinish}
              disabled={finishing}
              style={({ pressed }) => [
                styles.finishBtn,
                pressed && styles.finishBtnPressed,
                finishing && styles.btnDisabled,
              ]}
            >
              {finishing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.finishBtnText}>FINALIZAR</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* MODAL PARA AGREGAR CHECKPOINT / PARADA */}
      <Modal
        visible={checkpointModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCheckpointModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AÑADIR PARADA (CHECKPOINT)</Text>
              <Pressable
                onPress={() => setCheckpointModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>CATEGORÍA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setCpCategory(cat.value)}
                  style={[
                    styles.chip,
                    cpCategory === cat.value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      cpCategory === cat.value && { color: cat.iconColor, fontWeight: '800' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>NOMBRE DE LA PARADA</Text>
            <TextInput
              style={styles.modalInput}
              value={cpName}
              onChangeText={setCpName}
              placeholder="Ej. Vertiente de agua, Mirador Cóndores"
              placeholderTextColor="#6B7280"
              maxLength={80}
            />

            <Text style={styles.inputLabel}>NOTAS / OBSERVACIÓN (OPCIONAL)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={cpNotes}
              onChangeText={setCpNotes}
              placeholder="Ej. Sendero empinado, agua limpia para filtrar..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={3}
              maxLength={300}
            />

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setCheckpointModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveCheckpoint}
                disabled={addingCheckpoint}
                style={({ pressed }) => [styles.modalSaveBtn, pressed && styles.pressed]}
              >
                {addingCheckpoint ? (
                  <ActivityIndicator color="#064E3B" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>GUARDAR PARADA</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#051712' },
  mapContainer: {
    height: 290,
    width: '100%',
    position: 'relative',
  },
  floatingGpsBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsStatusText: {
    color: '#F9FAFB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  checkpointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  checkpointBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  hudScroll: { flex: 1 },
  hudContent: { padding: 14, gap: 12, paddingBottom: 36 },
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
  successText: { color: '#6EE7B7', fontSize: 11, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B1212',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 10,
  },
  errorText: { color: '#FCA5A5', fontSize: 11 },
  hudCard: {
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudMetric: { flex: 1 },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricValueLarge: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#1A4537',
  },
  hudRowSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudMetricSecondary: { flex: 1 },
  metricLabelSecondary: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metricValueSecondary: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '800',
  },
  controlsGroup: { gap: 10, marginTop: 4 },
  checkpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 13,
  },
  checkpointBtnText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  btnDisabled: { opacity: 0.4 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  pauseBtnActive: {
    backgroundColor: '#261C08',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pauseBtnText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  resumeBtn: {
    backgroundColor: '#10B981',
  },
  resumeBtnText: {
    color: '#064E3B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  finishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
  },
  finishBtnPressed: { opacity: 0.8 },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pressed: { opacity: 0.8 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 23, 18, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0E2E24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1A4537',
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A241C',
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 6,
  },
  chipActive: {
    borderColor: '#10B981',
    backgroundColor: '#0E2E24',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F9FAFB',
    fontSize: 12,
  },
  modalInputMultiline: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingBottom: 16,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    paddingVertical: 12,
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalSaveBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
  },
  modalSaveText: {
    color: '#064E3B',
    fontSize: 11,
    fontWeight: '800',
  },
});
