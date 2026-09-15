import { create } from 'zustand';
import type * as Location from 'expo-location';
import { appStorage } from './storage';
import { locationAdapter } from '../location/locationAdapter';
import { activityService } from '../database/activityService';
import type {
  Checkpoint,
  CheckpointCategory,
  Coordinates,
  RouteDifficulty,
  TrekkinActivity,
} from '../../core/domain/types';
import {
  StartActivityUseCase,
  RecordPointUseCase,
  AddCheckpointUseCase,
  FinishActivityUseCase,
} from '../../core/application/activity';

/**
 * HU-08 — Estado local de la actividad GPS en vivo (Zustand + AsyncStorage).
 * Administra el ciclo de vida de la grabación: seguimiento en primer plano (foreground),
 * acumulación de coordenadas mediante casos de uso, cronómetro, paradas y autosave local.
 */

const ACTIVITY_AUTOSAVE_KEY = 'trekking_activity_autosave';

export interface SavedActivitySession {
  activity: TrekkinActivity;
  checkpoints: Checkpoint[];
  destination: { lat: number; lng: number } | null;
  savedAt: number;
}

async function saveLocalActivitySession(
  activity: TrekkinActivity,
  checkpoints: Checkpoint[],
  destination: { lat: number; lng: number } | null
): Promise<void> {
  const session: SavedActivitySession = {
    activity,
    checkpoints,
    destination,
    savedAt: Date.now(),
  };
  await appStorage.setItem(ACTIVITY_AUTOSAVE_KEY, JSON.stringify(session));
}

async function loadLocalActivitySession(): Promise<SavedActivitySession | null> {
  const raw = await appStorage.getItem(ACTIVITY_AUTOSAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedActivitySession;
  } catch {
    return null;
  }
}

async function clearLocalActivitySession(): Promise<void> {
  await appStorage.removeItem(ACTIVITY_AUTOSAVE_KEY);
}

// Variables a nivel de módulo para evitar múltiples intervalos o suscripciones huérfanas
let timerInterval: ReturnType<typeof setInterval> | null = null;
let gpsSubscription: Location.LocationSubscription | null = null;

function clearTimerInterval(): void {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function stopGpsTracking(): void {
  if (gpsSubscription) {
    gpsSubscription.remove();
    gpsSubscription = null;
  }
}

export type ActivityTrackingStatus = 'idle' | 'in_progress' | 'paused' | 'completed';

export interface ActivityState {
  activity: TrekkinActivity | null;
  status: ActivityTrackingStatus;
  currentPosition: Coordinates | null;
  recordedPoints: Coordinates[];
  distanceCoveredKm: number;
  remainingDistanceKm: number;
  durationSeconds: number;
  checkpoints: Checkpoint[];
  gpsError: string | null;
  isTracking: boolean;
  destination: { lat: number; lng: number } | null;
  suggestedDifficulty: RouteDifficulty | null;

  // Acciones
  startActivity: (params: {
    userId: string;
    userName: string;
    routeId?: string;
    routeTitle?: string;
    destination?: { lat: number; lng: number };
  }) => Promise<boolean>;
  recordPoint: (point: Coordinates) => Promise<void>;
  pauseActivity: () => Promise<void>;
  resumeActivity: () => Promise<void>;
  finishActivity: (elevationGainM?: number) => Promise<boolean>;
  addCheckpoint: (params: {
    name: string;
    category: CheckpointCategory;
    notes?: string;
  }) => Promise<boolean>;
  clearActivity: () => Promise<void>;
  loadSavedActivity: () => Promise<boolean>;
  setDestination: (dest: { lat: number; lng: number } | null) => void;
  clearError: () => void;
}

function startTimerInterval(
  get: () => ActivityState,
  set: (partial: Partial<ActivityState> | ((state: ActivityState) => Partial<ActivityState>)) => void
): void {
  clearTimerInterval();
  timerInterval = setInterval(() => {
    const state = get();
    if (state.status === 'in_progress' && state.activity) {
      const nextDuration = state.durationSeconds + 1;
      const updatedActivity: TrekkinActivity = {
        ...state.activity,
        durationSeconds: nextDuration,
      };
      set({
        durationSeconds: nextDuration,
        activity: updatedActivity,
      });

      // Autosave periódico cada 10 segundos
      if (nextDuration % 10 === 0) {
        saveLocalActivitySession(updatedActivity, state.checkpoints, state.destination);
      }
    }
  }, 1000);
}

async function startGpsWatcher(
  get: () => ActivityState,
  set: (partial: Partial<ActivityState> | ((state: ActivityState) => Partial<ActivityState>)) => void
): Promise<void> {
  stopGpsTracking();
  const sub = await locationAdapter.watchPosition(
    (coords) => {
      get().recordPoint(coords);
    },
    (errMsg) => {
      set({ gpsError: errMsg });
    }
  );
  if (sub) {
    gpsSubscription = sub;
    set({ isTracking: true });
  } else {
    set({ isTracking: false });
  }
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activity: null,
  status: 'idle',
  currentPosition: null,
  recordedPoints: [],
  distanceCoveredKm: 0,
  remainingDistanceKm: 0,
  durationSeconds: 0,
  checkpoints: [],
  gpsError: null,
  isTracking: false,
  destination: null,
  suggestedDifficulty: null,

  startActivity: async (params) => {
    clearTimerInterval();
    stopGpsTracking();

    set({
      gpsError: null,
      status: 'in_progress',
      isTracking: true,
      suggestedDifficulty: null,
      destination: params.destination ?? null,
    });

    try {
      const initialPos = await locationAdapter.getCurrentPosition();

      const activity = await StartActivityUseCase(
        {
          userId: params.userId,
          userName: params.userName,
          routeId: params.routeId,
          routeTitle: params.routeTitle,
          initialPosition: initialPos ?? undefined,
          destination: params.destination,
        },
        {
          saveLocalActivity: async (act) => {
            await saveLocalActivitySession(act, [], params.destination ?? null);
          },
        }
      );

      set({
        activity,
        status: 'in_progress',
        currentPosition: initialPos,
        recordedPoints: activity.recordedPoints,
        distanceCoveredKm: activity.distanceCoveredKm,
        remainingDistanceKm: activity.remainingDistanceKm,
        durationSeconds: 0,
        checkpoints: [],
        isTracking: true,
      });

      startTimerInterval(get, set);
      await startGpsWatcher(get, set);

      return true;
    } catch (err: any) {
      clearTimerInterval();
      stopGpsTracking();
      const msg = err?.message ?? 'Error al iniciar la actividad';
      set({
        status: 'idle',
        isTracking: false,
        gpsError: msg,
      });
      return false;
    }
  },

  recordPoint: async (point: Coordinates) => {
    const { status, activity, destination } = get();

    // Actualiza siempre la posición en vivo para visualización en mapa
    set({ currentPosition: point, gpsError: null });

    // Solo acumula puntos si la actividad está en curso
    if (status !== 'in_progress' || !activity) {
      return;
    }

    try {
      const updated = await RecordPointUseCase(
        {
          activity,
          newPoint: point,
          destination: destination ?? undefined,
        },
        {
          saveLocalActivity: async (act) => {
            await saveLocalActivitySession(act, get().checkpoints, get().destination);
          },
        }
      );

      set({
        activity: updated,
        recordedPoints: updated.recordedPoints,
        distanceCoveredKm: updated.distanceCoveredKm,
        remainingDistanceKm: updated.remainingDistanceKm,
      });
    } catch (err) {
      console.warn('Error registrando coordenada GPS:', err);
    }
  },

  pauseActivity: async () => {
    const { status, activity, checkpoints, destination } = get();
    if (status !== 'in_progress' || !activity) return;

    clearTimerInterval();

    const updatedActivity: TrekkinActivity = {
      ...activity,
      status: 'paused',
    };

    set({
      status: 'paused',
      activity: updatedActivity,
    });

    await saveLocalActivitySession(updatedActivity, checkpoints, destination);
  },

  resumeActivity: async () => {
    const { status, activity, checkpoints, destination } = get();
    if (status !== 'paused' || !activity) return;

    const updatedActivity: TrekkinActivity = {
      ...activity,
      status: 'in_progress',
    };

    set({
      status: 'in_progress',
      activity: updatedActivity,
      gpsError: null,
    });

    startTimerInterval(get, set);
    await startGpsWatcher(get, set);
    await saveLocalActivitySession(updatedActivity, checkpoints, destination);
  },

  finishActivity: async (elevationGainM?: number) => {
    const { activity, durationSeconds, currentPosition } = get();
    if (!activity || get().status === 'completed') return false;

    clearTimerInterval();
    stopGpsTracking();

    try {
      const { activity: completed, suggestedDifficulty } = await FinishActivityUseCase(
        {
          activity,
          durationSeconds,
          elevationGainM,
          finalPoint: currentPosition ?? undefined,
        },
        {
          saveActivity: async (act) => {
            await activityService.createActivity(act);
          },
          saveLocalActivity: async (act) => {
            await saveLocalActivitySession(act, get().checkpoints, get().destination);
          },
        }
      );

      set({
        activity: completed,
        status: 'completed',
        isTracking: false,
        suggestedDifficulty,
        distanceCoveredKm: completed.distanceCoveredKm,
        durationSeconds: completed.durationSeconds,
        recordedPoints: completed.recordedPoints,
      });

      return true;
    } catch (err) {
      console.warn('Error al guardar actividad en Firestore (fallback local):', err);
      const now = Date.now();
      const localCompleted: TrekkinActivity = {
        ...activity,
        status: 'completed',
        finishedAt: now,
        durationSeconds,
        isSynced: false,
      };
      set({
        activity: localCompleted,
        status: 'completed',
        isTracking: false,
      });
      await saveLocalActivitySession(localCompleted, get().checkpoints, get().destination);
      return true;
    }
  },

  addCheckpoint: async (params) => {
    const { activity, currentPosition, recordedPoints } = get();
    if (!activity) return false;

    const pos =
      currentPosition ?? (recordedPoints.length > 0 ? recordedPoints[recordedPoints.length - 1] : null);
    if (!pos) {
      set({ gpsError: 'No hay posición GPS para registrar la parada' });
      return false;
    }

    try {
      const nextCheckpoints = [...get().checkpoints];
      const { activity: updatedActivity, checkpoint } = await AddCheckpointUseCase(
        {
          activity,
          checkpoint: {
            name: params.name,
            category: params.category,
            lat: pos.lat,
            lng: pos.lng,
            notes: params.notes,
          },
        },
        {
          saveLocalActivity: async (act) => {
            await saveLocalActivitySession(
              act,
              [...nextCheckpoints, checkpoint],
              get().destination
            );
          },
        }
      );

      set({
        activity: updatedActivity,
        checkpoints: [...get().checkpoints, checkpoint],
      });
      return true;
    } catch (err: any) {
      set({ gpsError: err?.message ?? 'Error al registrar parada' });
      return false;
    }
  },

  clearActivity: async () => {
    clearTimerInterval();
    stopGpsTracking();
    await clearLocalActivitySession();
    set({
      activity: null,
      status: 'idle',
      currentPosition: null,
      recordedPoints: [],
      distanceCoveredKm: 0,
      remainingDistanceKm: 0,
      durationSeconds: 0,
      checkpoints: [],
      gpsError: null,
      isTracking: false,
      destination: null,
      suggestedDifficulty: null,
    });
  },

  loadSavedActivity: async () => {
    const session = await loadLocalActivitySession();
    if (!session || !session.activity) return false;

    if (session.activity.status === 'in_progress' || session.activity.status === 'paused') {
      const lastPoint =
        session.activity.recordedPoints.length > 0
          ? session.activity.recordedPoints[session.activity.recordedPoints.length - 1]
          : null;

      const pausedActivity: TrekkinActivity = {
        ...session.activity,
        status: 'paused',
      };

      set({
        activity: pausedActivity,
        status: 'paused',
        currentPosition: lastPoint,
        recordedPoints: pausedActivity.recordedPoints,
        distanceCoveredKm: pausedActivity.distanceCoveredKm,
        remainingDistanceKm: pausedActivity.remainingDistanceKm,
        durationSeconds: pausedActivity.durationSeconds,
        checkpoints: session.checkpoints ?? [],
        destination: session.destination ?? null,
        isTracking: false,
        gpsError: null,
      });

      return true;
    }
    return false;
  },

  setDestination: (dest) => set({ destination: dest }),

  clearError: () => set({ gpsError: null }),
}));

