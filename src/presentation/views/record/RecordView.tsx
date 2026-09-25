import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ArrowLeft, X } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import { useActivityStore } from '../../../infrastructure/persistence/useActivityStore';
import { RECORDING_WATCH_OPTIONS } from '../../../infrastructure/location/locationService';
import { ImportTrackFileUseCase } from '../../../core/application/plan/ImportTrackFile.usecase';
import type { FinishActivityResult } from '../../../core/application/activity/FinishActivity.usecase';
import { DraftsView } from './DraftsView';
import { CreateRouteView } from './CreateRouteView';
import { PlanEditorView } from './PlanEditorView';
import { StartPointConfirmView } from './StartPointConfirmView';
import { ReadyForGpsView } from './ReadyForGpsView';
import { TrackingView } from '../activity/TrackingView';
import { ResultView } from '../activity/ResultView';
import { ActivityDetailView } from '../activity/ActivityDetailView';
import type { TrekkinActivity } from '../../../core/domain/types';
import { isFreeRecording, isResumableLive } from '../../../core/domain/activity';
import { AndeanTheme } from '../../theme';

/**
 * HU-07 + HU-08 — Planificación y grabación GPS.
 * drafts -> create -> editor -> confirm -> ready -> recording -> summary.
 */
type RecordStep =
  | 'drafts'
  | 'create'
  | 'editor'
  | 'confirm'
  | 'ready'
  | 'recording'
  | 'summary'
  | 'detail';

interface RecordViewProps {
  onClose?: () => void;
  initialImportedGpxUrl?: string | null;
}

const STEP_TITLES: Record<RecordStep, string> = {
  drafts: 'MI PLANIFICACIÓN',
  create: 'CREAR NUEVA RUTA',
  editor: 'EDITAR PLANIFICACIÓN',
  confirm: 'CONFIRMAR PUNTO DE INICIO',
  ready: 'LISTA PARA GRABAR',
  recording: 'GRABANDO RECORRIDO',
  summary: 'RESUMEN DE RUTA',
  detail: 'RECORRIDO',
};

export const RecordView: React.FC<RecordViewProps> = ({ onClose, initialImportedGpxUrl }) => {
  const { currentUser } = useAuth();
  const { plan, initializePlan, newDraftPlan, setPlanMeta, setPoints } = usePlanStore();
  const [step, setStep] = useState<RecordStep>('drafts');
  const [lastSaved, setLastSaved] = useState<TrekkinActivity | null>(null);

  useEffect(() => {
    if (!initialImportedGpxUrl || !currentUser) return;

    let active = true;
    (async () => {
      try {
        const content = await FileSystem.readAsStringAsync(initialImportedGpxUrl);
        const imported = ImportTrackFileUseCase({
          fileContent: content,
          fileExtension: 'gpx',
        });

        await newDraftPlan(currentUser.uid, currentUser.displayName);
        setPlanMeta({
          title: imported.title,
          notes: imported.description ?? '',
        });

        if (imported.waypoints.length >= 2) {
          const start = imported.waypoints[0];
          const end = imported.waypoints[imported.waypoints.length - 1];
          await setPoints(
            { lat: start.lat, lng: start.lng, name: 'Inicio GPX' },
            { lat: end.lat, lng: end.lng, name: 'Fin GPX' },
          );
        }

        if (active) setStep('editor');
      } catch (error) {
        if (active) {
          Alert.alert(
            'No se pudo abrir el archivo GPX',
            'El archivo recibido no es válido o no se pudo leer. Intenta abrirlo otra vez.',
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [currentUser, initialImportedGpxUrl, newDraftPlan, setPlanMeta, setPoints]);

  useEffect(() => {
    if (currentUser) {
      initializePlan(currentUser.uid, currentUser.displayName);
    }
    const live = useActivityStore.getState().live;
    if (isResumableLive(live) && !isFreeRecording(live)) {
      setStep('recording');
    } else {
      useActivityStore
        .getState()
        .restoreLiveSession()
        .then((hasActive) => {
          const restored = useActivityStore.getState().live;
          if (hasActive && isResumableLive(restored) && !isFreeRecording(restored)) {
            setStep('recording');
          }
        });
    }
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  const goBack = () => {
    if (step === 'create' || step === 'editor') {
      setStep('drafts');
      return;
    }
    if (step === 'confirm') {
      setStep('editor');
      return;
    }
    if (step === 'ready') {
      setStep('drafts');
      return;
    }
    if (step === 'detail') {
      setStep('summary');
      return;
    }
    if (step === 'summary') {
      setStep('drafts');
      return;
    }
    if (step === 'recording') {
      Alert.alert(
        'Grabación en curso',
        'La actividad sigue registrándose en primer plano. ¿Pausar y volver al menú?',
        [
          { text: 'Seguir grabando', style: 'cancel' },
          {
            text: 'Salir al menú',
            onPress: async () => {
              await useActivityStore.getState().pauseActivity();
              setStep('drafts');
            },
          },
        ],
      );
      return;
    }
    if (onClose) onClose();
  };

  const handleCreate = () => {
    newDraftPlan(currentUser.uid, currentUser.displayName);
    setStep('create');
  };

  const handleOpenDraft = async (id: string) => {
    const ok = await usePlanStore.getState().loadDraft(id, currentUser.uid);
    if (ok) setStep('editor');
  };

  const handleSaved = () => setStep('editor');

  const handleStartRecording = async () => {
    const live = useActivityStore.getState().live;
    if (live && (live.phase === 'in_progress' || live.phase === 'paused')) {
      setStep('recording');
      return;
    }
    const currentPlan = usePlanStore.getState().plan;
    if (!currentPlan) return;
    await usePlanStore.getState().markReadyForGps();
    const readyPlan = usePlanStore.getState().plan;
    if (!readyPlan) return;
    const ok = await useActivityStore
      .getState()
      .startFromPlan(readyPlan, currentUser.uid, currentUser.displayName);
    if (ok) setStep('recording');
  };

  const handleFinished = (result: FinishActivityResult) => {
    setLastSaved(result.saved);
    setStep('summary');
  };

  const handleSummaryDone = async () => {
    await usePlanStore.getState().clearPlan();
    await useActivityStore.getState().clearLive();
    setLastSaved(null);
    setStep('drafts');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <ArrowLeft size={18} color={AndeanTheme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
        {step === 'drafts' && onClose ? (
          <Pressable onPress={onClose} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
            <X size={18} color={AndeanTheme.colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* Hoja blanca: todos los pasos viven sobre la hoja clara (capas duales). */}
      <View style={styles.sheet}>
        {step === 'drafts' && <DraftsView onCreate={handleCreate} onOpen={handleOpenDraft} />}
        {step === 'create' && <CreateRouteView onSaved={handleSaved} />}
        {step === 'editor' && <PlanEditorView onContinue={() => setStep('confirm')} />}
        {step === 'confirm' && (
          <StartPointConfirmView
            onConfirmed={async () => {
              await usePlanStore.getState().markReadyForGps();
              setStep('ready');
            }}
          />
        )}
        {step === 'ready' && (
          <ReadyForGpsView
            onStartRecording={handleStartRecording}
            onDone={() => {
              usePlanStore.getState().clearPlan();
              setStep('drafts');
            }}
          />
        )}
        {step === 'recording' && (
          <TrackingView
            onFinish={handleFinished}
            watchOptions={RECORDING_WATCH_OPTIONS}
          />
        )}
        {step === 'summary' && lastSaved && (
          <ResultView
            saved={lastSaved}
            onViewTrack={() => setStep('detail')}
            onClose={handleSummaryDone}
          />
        )}
        {step === 'detail' && lastSaved && (
          <ActivityDetailView activity={lastSaved} onBack={() => setStep('summary')} />
        )}

        {plan && (step === 'create' || step === 'editor' || step === 'confirm') && (
          <Text style={styles.footNote}>Autosave activo · No perderás tu planificación</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AndeanTheme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  headerTitle: { flex: 1, color: AndeanTheme.colors.text, fontSize: 15, fontWeight: '900' },
  sheet: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.sheet,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  footNote: {
    textAlign: 'center',
    color: AndeanTheme.colors.fieldHint,
    fontSize: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
