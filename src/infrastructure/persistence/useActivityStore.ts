import { create } from "zustand";
import type { LiveActivity } from "../../core/domain/activity";
import type { TrekkinActivity, RouteModel } from "../../core/domain/types";
import type { RoutePlan } from "../../core/domain/plan";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSerialQueue } from "./serialQueue";
import { routeService } from "../database/routeService";
import { activityService } from "../database/activityService";
import {
  locationService,
  type GpsPosition,
  type LocationWatch,
  type LocationAccuracyOptions,
} from "../location/locationService";
import { StartActivityUseCase } from "../../core/application/activity/StartActivity.usecase";
import { StartRecordingFromPlanUseCase } from "../../core/application/activity/StartRecordingFromPlan.usecase";
import {
  StartFreeRecordingUseCase,
  type FreeRecordingPosition,
} from "../../core/application/activity/StartFreeRecording.usecase";
import { BeginTrackingUseCase } from "../../core/application/activity/BeginTracking.usecase";
import { RecordPointUseCase } from "../../core/application/activity/RecordPoint.usecase";
import { PauseActivityUseCase } from "../../core/application/activity/PauseActivity.usecase";
import { ResumeActivityUseCase } from "../../core/application/activity/ResumeActivity.usecase";
import {
  FinishActivityUseCase,
  type FinishActivityResult,
} from "../../core/application/activity/FinishActivity.usecase";
import {
  AddCheckpointUseCase,
  type AddCheckpointInput,
} from "../../core/application/activity/AddCheckpoint.usecase";
import { ListActivitiesUseCase } from "../../core/application/activity/ListActivities.usecase";
import { GetActivityUseCase } from "../../core/application/activity/GetActivity.usecase";

/**
 * HU-06 — Estado de la actividad (zustand) con autosave local.
 * - La actividad en curso vive en AsyncStorage (clave trekking_activity_autosave),
 *   por lo que no se pierde al salir de la pantalla ni ante pérdida de conexión.
 * - El recorrido se persiste en Firestore al FINALIZAR (colección `activities`).
 * - Completed activities stay in the local archive, including after cloud upload.
 *   The legacy unsynced key is retained for compatibility with existing records.
 */
const AUTOSAVE_KEY = "trekking_activity_autosave";
const UNSYNCED_KEY = "trekking_activity_unsynced";
const enqueue = createSerialQueue();
let watchGeneration = 0;

function saveLive(live: LiveActivity): Promise<void> {
  return AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(live));
}

function loadLive(): Promise<LiveActivity | null> {
  return AsyncStorage.getItem(AUTOSAVE_KEY).then((raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LiveActivity;
    } catch {
      throw new Error("No se pudo leer la grabación local. No se ha borrado.");
    }
  });
}

function saveUnsynced(list: TrekkinActivity[]): Promise<void> {
  return AsyncStorage.setItem(UNSYNCED_KEY, JSON.stringify(list));
}

function loadUnsynced(): Promise<TrekkinActivity[] | null> {
  return AsyncStorage.getItem(UNSYNCED_KEY).then((raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TrekkinActivity[];
    } catch {
      throw new Error("No se pudo leer el historial local. No se ha borrado.");
    }
  });
}

interface ActivityState {
  live: LiveActivity | null;
  activities: TrekkinActivity[];
  unsynced: TrekkinActivity[];
  lastResult: TrekkinActivity | null;
  catalogRoutes: RouteModel[];
  isLoading: boolean;
  finishing: boolean;
  error: string | null;
  watch: LocationWatch | null;

  loadCatalog: () => Promise<void>;
  startRoute: (
    uid: string,
    userName: string,
    routeId: string,
  ) => Promise<boolean>;
  startFromPlan: (
    plan: RoutePlan,
    uid: string,
    userName: string,
  ) => Promise<boolean>;
  startFreeRecording: (
    position: FreeRecordingPosition,
    uid: string,
    userName: string,
  ) => Promise<boolean>;
  beginTracking: () => Promise<boolean>;
  recordPoint: (p: GpsPosition) => Promise<void>;
  pauseActivity: () => Promise<boolean>;
  resumeActivity: () => Promise<boolean>;
  finishActivity: () => Promise<FinishActivityResult | null>;
  addCheckpoint: (input: AddCheckpointInput) => Promise<boolean>;
  startWatch: (options?: LocationAccuracyOptions) => Promise<boolean>;
  stopWatch: () => void;
  listActivities: (uid: string) => Promise<void>;
  loadActivity: (id: string, uid: string) => Promise<TrekkinActivity | null>;
  restoreLiveSession: () => Promise<boolean>;
  clearLive: () => Promise<void>;
  clearError: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  live: null,
  activities: [],
  unsynced: [],
  lastResult: null,
  catalogRoutes: [],
  isLoading: false,
  finishing: false,
  error: null,
  watch: null,

  restoreLiveSession: () => enqueue(async () => {
    if (get().live) return get().live!.phase === "in_progress" || get().live!.phase === "paused";
    const restored = await loadLive();
    if (restored) {
      const resumable =
        restored.phase === "in_progress" || restored.phase === "paused";
      if (resumable) {
        set({ live: restored });
        return true;
      }
    }
    return false;
  }),

  loadCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      // Restaurar actividad persistida (no se pierde al salir de la pantalla),
      // pero solo si está en curso o pausada. Una selección sin iniciar (ready)
      // o una actividad ya cerrada (finished) vuelve a mostrar el catálogo.
      await get().restoreLiveSession();
      const routes = await routeService.listPublishedRoutes();
      set({ catalogRoutes: routes, isLoading: false });
    } catch (err: unknown) {
      set({
        catalogRoutes: [],
        error:
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las rutas de Firestore.",
        isLoading: false,
      });
    }
  },

  startRoute: (uid, userName, routeId) => enqueue(async () => {
    set({ isLoading: true, error: null });
    try {
      const live = await StartActivityUseCase(
        { routeId, userId: uid, userName },
        {
          getRoute: (id) => routeService.getRoute(id),
        },
      );
      await saveLive(live);
      set({ live, isLoading: false });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo cargar la ruta seleccionada.",
        isLoading: false,
      });
      return false;
    }
  }),

  startFromPlan: (plan, uid, userName) => enqueue(async () => {
    set({ isLoading: true, error: null });
    try {
      const prepared = StartRecordingFromPlanUseCase({
        plan,
        userId: uid,
        userName,
      });
      const live = await BeginTrackingUseCase(prepared);
      await saveLive(live);
      set({ live, isLoading: false });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la grabación GPS.",
        isLoading: false,
      });
      return false;
    }
  }),

  startFreeRecording: (position, uid, userName) => enqueue(async () => {
    set({ isLoading: true, error: null });
    try {
      const prepared = StartFreeRecordingUseCase({
        position,
        userId: uid,
        userName,
      });
      const live = await BeginTrackingUseCase(prepared);
      await saveLive(live);
      set({ live, isLoading: false });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la grabación GPS.",
        isLoading: false,
      });
      return false;
    }
  }),

  beginTracking: () => enqueue(async () => {
    const live = get().live;
    if (!live) return false;
    set({ error: null });
    try {
      const updated = await BeginTrackingUseCase(live);
      await saveLive(updated);
      set({ live: updated });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la actividad",
      });
      return false;
    }
  }),

  recordPoint: (p) => enqueue(async () => {
    const live = get().live;
    if (!live || live.phase !== "in_progress") return;
    try {
      const point = {
        lat: p.latitude,
        lng: p.longitude,
        timestamp: p.timestamp,
        accuracy: p.accuracy,
        altitude: p.altitude,
        speed: p.speed,
      };
      const updated = await RecordPointUseCase(live, point);
      await saveLive(updated);
      set({ live: updated });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : "No se pudo guardar el punto GPS." });
    }
  }),

  pauseActivity: () => enqueue(async () => {
    const live = get().live;
    if (!live) return false;
    set({ error: null });
    try {
      const updated = await PauseActivityUseCase(live);
      get().stopWatch();
      await saveLive(updated);
      set({ live: updated });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error ? err.message : "No se pudo pausar la actividad",
      });
      return false;
    }
  }),

  resumeActivity: () => enqueue(async () => {
    const live = get().live;
    if (!live) return false;
    set({ error: null });
    try {
      const updated = await ResumeActivityUseCase(live);
      await saveLive(updated);
      set({ live: updated });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo reanudar la actividad",
      });
      return false;
    }
  }),

  addCheckpoint: (input: AddCheckpointInput) => enqueue(async () => {
    const live = get().live;
    if (!live) return false;
    try {
      const { activity } = AddCheckpointUseCase(live, input);
      await saveLive(activity);
      set({ live: activity });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo registrar la parada",
      });
      return false;
    }
  }),

  finishActivity: () => enqueue(async () => {
    const live = get().live;
    if (!live || live.phase === "finished") return null;
    set({ finishing: true, error: null });
    get().stopWatch();
    try {
      let localHistory = (await loadUnsynced()) ?? [];
      const finished = await FinishActivityUseCase(live, {
        // The durable local archive is the completion boundary, not the network.
        saveActivity: async (saved) => {
          localHistory = [...localHistory.filter((a) => a.id !== saved.id), { ...saved, isSynced: false }];
          await saveUnsynced(localHistory);
        },
        saveLocalActivity: saveLive,
      });
      const result = { ...finished, saved: { ...finished.saved, isSynced: false } };
      set({
        live: result.activity,
        lastResult: result.saved,
        unsynced: localHistory.filter((a) => !a.isSynced),
        finishing: false,
      });
      void activityService.createActivity({ ...result.saved, isSynced: true })
        .then(() => enqueue(async () => {
          const history = ((await loadUnsynced()) ?? []).map((a) =>
            a.id === result.saved.id ? { ...a, isSynced: true } : a);
          await saveUnsynced(history);
          set({ unsynced: history.filter((a) => !a.isSynced) });
        }))
        .catch(() => { /* The local archive remains available for export and retry. */ });
      return result;
    } catch (err: unknown) {
      set({
        finishing: false,
        error: err instanceof Error ? err.message : "No se pudo guardar la actividad en el dispositivo.",
      });
      return null;
    }
  }),

  startWatch: async (options) => {
    get().stopWatch();
    const generation = watchGeneration;
    const sub = await locationService.startWatching((p) => {
      get().recordPoint(p);
    }, options);
    if (generation !== watchGeneration || get().live?.phase !== "in_progress") {
      if (sub) locationService.stopWatching(sub);
      return false;
    }
    set({ watch: sub });
    return sub != null;
  },

  stopWatch: () => {
    watchGeneration += 1;
    const { watch } = get();
    if (watch) locationService.stopWatching(watch);
    set({ watch: null });
  },

  listActivities: async (uid) => {
    set({ activities: [], isLoading: true, error: null });
    try {
      const joined = ((await loadUnsynced()) ?? []).filter((a) => a.userId === uid);
      set({ activities: joined, unsynced: joined.filter((a) => !a.isSynced), isLoading: false });
      const remote = await ListActivitiesUseCase(uid, {
        listByUser: activityService.listUserActivities,
      });
      const merged = [
        ...joined,
        ...remote.filter((r) => !joined.some((j) => j.id === r.id)),
      ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      set({ activities: merged, isLoading: false });
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las actividades.",
        isLoading: false,
      });
    }
  },

  loadActivity: async (id, uid) => {
    set({ error: null });
    const local = ((await loadUnsynced()) ?? []).find((a) => a.id === id && a.userId === uid);
    if (local) return local;
    try {
      return await GetActivityUseCase(
        { id, userId: uid },
        { get: activityService.getActivity },
      );
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo cargar la actividad.",
      });
      return null;
    }
  },

  clearLive: () => enqueue(async () => {
    get().stopWatch();
    await AsyncStorage.removeItem(AUTOSAVE_KEY);
    set({ live: null, lastResult: null, error: null });
  }),

  clearError: () => set({ error: null }),
}));
