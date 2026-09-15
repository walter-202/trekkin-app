import { create } from "zustand";
import type { LiveActivity } from "../../core/domain/activity";
import { toTrekkinActivity } from "../../core/domain/activity";
import type { TrekkinActivity, RouteModel } from "../../core/domain/types";
import { appStorage } from "./storage";
import { routeService } from "../database/routeService";
import { SEED_PUBLISHED_ROUTES } from "../database/routeSeed";
import { activityService } from "../database/activityService";
import {
  locationService,
  type GpsPosition,
  type LocationWatch,
} from "../location/locationService";
import { StartActivityUseCase } from "../../core/application/activity/StartActivity.usecase";
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
 * - Si el guardado en Firestore falla (ej. sin red), la actividad se conserva en
 *   una lista local de pendientes de sincronización y se muestra en el historial.
 */
const AUTOSAVE_KEY = "trekking_activity_autosave";
const UNSYNCED_KEY = "trekking_activity_unsynced";

function saveLive(live: LiveActivity): Promise<void> {
  return appStorage.setItem(AUTOSAVE_KEY, JSON.stringify(live));
}

function loadLive(): Promise<LiveActivity | null> {
  return appStorage.getItem(AUTOSAVE_KEY).then((raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LiveActivity;
    } catch {
      return null;
    }
  });
}

function saveUnsynced(list: TrekkinActivity[]): Promise<void> {
  return appStorage.setItem(UNSYNCED_KEY, JSON.stringify(list));
}

function loadUnsynced(): Promise<TrekkinActivity[] | null> {
  return appStorage.getItem(UNSYNCED_KEY).then((raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TrekkinActivity[];
    } catch {
      return null;
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
  beginTracking: () => Promise<boolean>;
  recordPoint: (p: GpsPosition) => Promise<void>;
  pauseActivity: () => Promise<boolean>;
  resumeActivity: () => Promise<boolean>;
  finishActivity: () => Promise<FinishActivityResult | null>;
  addCheckpoint: (input: AddCheckpointInput) => Promise<boolean>;
  startWatch: () => Promise<boolean>;
  stopWatch: () => void;
  listActivities: (uid: string) => Promise<void>;
  loadActivity: (id: string, uid: string) => Promise<TrekkinActivity | null>;
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

  loadCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      // Restaurar actividad persistida (no se pierde al salir de la pantalla),
      // pero solo si está en curso o pausada. Una selección sin iniciar (ready)
      // o una actividad ya cerrada (finished) vuelve a mostrar el catálogo.
      const restored = await loadLive();
      if (restored) {
        const resumable =
          restored.phase === "in_progress" || restored.phase === "paused";
        if (resumable) {
          set({ live: restored });
        } else {
          await appStorage.removeItem(AUTOSAVE_KEY);
        }
      }
      let routes = await routeService.listPublishedRoutes();
      if (routes.length === 0) {
        // Fallback demo (mismo catálogo que HU-03): Firestore sin rutas
        // `published` en dev → usa el seed local para no bloquear el flujo.
        routes = SEED_PUBLISHED_ROUTES;
      }
      set({ catalogRoutes: routes, isLoading: false });
    } catch {
      set({
        catalogRoutes: SEED_PUBLISHED_ROUTES,
        error: "Sin conexión a Firestore. Mostrando datos demo.",
        isLoading: false,
      });
    }
  },

  startRoute: async (uid, userName, routeId) => {
    set({ isLoading: true, error: null });
    try {
      const live = await StartActivityUseCase(
        { routeId, userId: uid, userName },
        {
          getRoute: async (id) => {
            const fromDb = await routeService.getRoute(id);
            if (fromDb) return fromDb;
            return SEED_PUBLISHED_ROUTES.find((r) => r.id === id) ?? null;
          },
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
  },

  beginTracking: async () => {
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
  },

  recordPoint: async (p) => {
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
    } catch {
      // Punto descartado o estado inválido: no interrumpir el seguimiento.
    }
  },

  pauseActivity: async () => {
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
  },

  resumeActivity: async () => {
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
  },

  addCheckpoint: async (input: AddCheckpointInput) => {
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
  },

  finishActivity: async () => {
    const live = get().live;
    if (!live) return null;
    set({ finishing: true, error: null });
    get().stopWatch();
    try {
      const result = await FinishActivityUseCase(live, {
        saveActivity: activityService.createActivity,
        saveLocalActivity: saveLive,
      });
      set({
        live: result.activity,
        lastResult: result.saved,
        finishing: false,
      });
      return result;
    } catch (err: unknown) {
      // Local primero, Firestore después: ante cualquier fallo de guardado se
      // conserva un resultado local para que el Resultado SIEMPRE aparezca.
      const raw = await loadLive();
      const failed = raw && raw.phase === "finished" ? raw : null;
      const liveNow = failed ?? get().live;
      if (!liveNow) {
        set({
          error:
            err instanceof Error
              ? err.message
              : "No se pudo guardar la actividad. Intenta nuevamente.",
          finishing: false,
        });
        return null;
      }
      const finishedNow: LiveActivity = failed ?? {
        ...liveNow,
        phase: "finished",
        finishedAt: Date.now(),
        updatedAt: Date.now(),
      };
      const pending = toTrekkinActivity(finishedNow, { isSynced: false });
      const prev = (await loadUnsynced()) ?? [];
      const next = [...prev.filter((a) => a.id !== pending.id), pending];
      await saveUnsynced(next);
      set({
        live: finishedNow,
        lastResult: pending,
        unsynced: next,
        finishing: false,
        error: "No se pudo guardar la actividad. Intenta nuevamente.",
      });
      return { activity: finishedNow, saved: pending };
    }
  },

  startWatch: async () => {
    get().stopWatch();
    const sub = await locationService.startWatching((p) => {
      get().recordPoint(p);
    });
    set({ watch: sub });
    return sub != null;
  },

  stopWatch: () => {
    const { watch } = get();
    if (watch) locationService.stopWatching(watch);
    set({ watch: null });
  },

  listActivities: async (uid) => {
    set({ isLoading: true, error: null });
    try {
      const joined = (await loadUnsynced()) ?? [];
      const remote = await ListActivitiesUseCase(uid, {
        listByUser: activityService.listUserActivities,
      });
      const merged = [
        ...joined.filter((j) => !remote.some((r) => r.id === j.id)),
        ...remote,
      ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      set({ activities: merged, unsynced: joined, isLoading: false });
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
    const local = (
      get().unsynced.length > 0
        ? get().unsynced
        : ((await loadUnsynced()) ?? [])
    ).find((a) => a.id === id);
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

  clearLive: async () => {
    get().stopWatch();
    set({ live: null, lastResult: null, error: null });
    await appStorage.removeItem(AUTOSAVE_KEY);
  },

  clearError: () => set({ error: null }),
}));
