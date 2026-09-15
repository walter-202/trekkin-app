import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { ArrowLeft, X } from 'lucide-react-native';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import { useActivityStore } from '../../../infrastructure/persistence/useActivityStore';
import { DraftsView } from './DraftsView';
import { CreateRouteView } from './CreateRouteView';
import { PlanEditorView } from './PlanEditorView';
import { StartPointConfirmView } from './StartPointConfirmView';
import { ReadyForGpsView } from './ReadyForGpsView';
import { RecordingActivityView } from './RecordingActivityView';
import { ActivitySummaryView } from './ActivitySummaryView';

/**
 * HU-07 + HU-08 — Hub de planificación y grabación GPS de rutas.
 * Máquina de estados interna (sin librería de navegación externa):
 * drafts -> create -> editor -> confirm -> ready -> recording -> summary.
 */
type RecordStep =
  | 'drafts'
  | 'create'
  | 'editor'
  | 'confirm'
  | 'ready'
  | 'recording'
  | 'summary';

interface RecordViewProps {
  onClose?: () => void;
}

const STEP_TITLES: Record<RecordStep, string> = {
  drafts: 'MI PLANIFICACIÓN',
  create: 'CREAR NUEVA RUTA',
  editor: 'EDITAR PLANIFICACIÓN',
  confirm: 'CONFIRMAR PUNTO DE INICIO',
  ready: 'LISTA PARA GRABAR',
  recording: 'GRABANDO RECORRIDO',
  summary: 'RESUMEN DE RUTA',
};

export const RecordView: React.FC<RecordViewProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const { plan, initializePlan, newDraftPlan } = usePlanStore();
  const [step, setStep] = useState<RecordStep>('drafts');

  useEffect(() => {
    if (currentUser) {
      initializePlan(currentUser.uid, currentUser.displayName);
    }

    // Si ya existe una sesión de grabación activa o recuperable en almacenamiento local
    const activeActivity = useActivityStore.getState().activity;
    const activeStatus = useActivityStore.getState().status;
    if (activeActivity && (activeStatus === 'in_progress' || activeStatus === 'paused')) {
      setStep('recording');
    } else {
      useActivityStore.getState().loadSavedActivity().then((hasActiveSession) => {
        if (hasActiveSession) {
          setStep('recording');
        }
      });
    }
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  const goBack = () => {
    if (step === 'create') setStep('drafts');
    else if (step === 'editor') setStep('drafts');
    else if (step === 'confirm') setStep('editor');
    else if (step === 'ready') setStep('drafts');
    else if (step === 'recording') {
      Alert.alert(
        'Grabación en curso',
        'La actividad sigue registrándose en primer plano. ¿Deseas pausar y volver al menú?',
        [
          { text: 'Continuar grabando', style: 'cancel' },
          {
            text: 'Salir al menú',
            onPress: () => {
              useActivityStore.getState().pauseActivity();
              setStep('drafts');
            },
          },
        ]
      );
    } else if (step === 'summary') {
      setStep('drafts');
    } else if (onClose) {
      onClose();
    }
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
    if (!currentUser) return;
    const dest = plan?.endPoint ? { lat: plan.endPoint.lat, lng: plan.endPoint.lng } : undefined;
    const ok = await useActivityStore.getState().startActivity({
      userId: currentUser.uid,
      userName: currentUser.displayName,
      routeId: plan?.id,
      routeTitle: plan?.title,
      destination: dest,
    });
    if (ok) {
      setStep('recording');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerBtn} accessibilityLabel="Volver">
          <ArrowLeft size={18} color="#F9FAFB" />
        </Pressable>
        <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
        {step === 'drafts' && onClose ? (
          <Pressable onPress={onClose} style={styles.headerBtn} accessibilityLabel="Cerrar">
            <X size={18} color="#9CA3AF" />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {step === 'drafts' && <DraftsView onCreate={handleCreate} onOpen={handleOpenDraft} />}
      {step === 'create' && <CreateRouteView onSaved={handleSaved} />}
      {step === 'editor' && <PlanEditorView onContinue={() => setStep('confirm')} />}
      {step === 'confirm' && <StartPointConfirmView onConfirmed={() => setStep('ready')} />}
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
        <RecordingActivityView
          onFinished={() => setStep('summary')}
          onCancel={() => setStep('drafts')}
        />
      )}
      {step === 'summary' && (
        <ActivitySummaryView
          onDone={() => {
            usePlanStore.getState().clearPlan();
            useActivityStore.getState().clearActivity();
            setStep('drafts');
          }}
        />
      )}

      {plan && (step === 'create' || step === 'editor' || step === 'confirm') && (
        <Text style={styles.footNote}>Autosave activo · No perderás tu planificación</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#051712' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
  },
  headerTitle: { flex: 1, color: '#F9FAFB', fontSize: 15, fontWeight: '900' },
  footNote: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 10,
    paddingBottom: 8,
  },
});