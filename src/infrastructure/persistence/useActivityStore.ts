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
import {
  resolvePointPersistence,
  restoreLiveFromHeader,
  sliceWindow,
  nextSeqAfterMax,
  slimLiveForAutosave,
  TRACK_WINDOW_SIZE,
} from "../../core/application/activity/TrackWindow";
import { accumulatedDistanceKm, haversineKm } from "../../core/domain/calculations";
import { ACTIVITY_CONFIG } from "../../core/domain/activity";
import {
  openTrackDbConnection,
  migrateTrackDb,
  saveActivityHeader,
  updateActivityHeader,
  insertTrackPoint,
  backfillTrackPoints,
  getMaxSeq,
  countTrackPoints,
  getLastTrackPoints,
  getTrackPointsPage,
  deleteActivity as deleteTrackDbActivity,
} from "../database/activityTrackDb";
import type {
  ActivityHeader,
  NewTrackPoint,
  TrackDbConnection,
} from "../database/activityTrackDb";

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

function saveLiveHeader(live: LiveActivity): Promise<void> {
  return AsyncStorage.setItem(
    AUTOSAVE_KEY,
    JSON.stringify(slimLiveForAutosave(live)),
  );
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

let trackDb: TrackDbConnection | null = null;
let trackCursor: { activityId: string; nextSeq: number } | null = null;
let trackPersistenceUnavailable = false;

function getTrackDb(): TrackDbConnection {
  if (!trackDb) {
    trackDb = openTrackDbConnection();
    migrateTrackDb(trackDb);
  }
  return trackDb;
}

function toNewTrackPoint(point: {
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  timestamp?: number;
}): NewTrackPoint {
  return {
    lat: point.lat,
    lng: point.lng,
    altitude: point.altitude ?? null,
    accuracy: point.accuracy ?? null,
    speed: point.speed ?? null,
    timestamp: point.timestamp ?? Date.now(),
  };
}

function headerFromLive(live: LiveActivity): ActivityHeader {
  return {
    id: live.id,
    userId: live.userId,
    routeId: live.route.routeId,
    routeTitle: live.route.routeTitle,
    origin: live.origin ?? null,
    status: live.phase,
    startedAt: live.startedAt ?? live.createdAt,
    finishedAt: live.finishedAt ?? null,
    distanceKm: live.totalDistanceKm ?? 0,
    durationSec: Math.round(live.accumulatedActiveMs / 1000),
    synced: 0,
    createdAt: live.createdAt,
    updatedAt: live.updatedAt,
  };
}

function ensureTrackReady(live: LiveActivity): number {
  if (trackCursor?.activityId === live.id) return trackCursor.nextSeq;
  const db = getTrackDb();
  let max = getMaxSeq(db, live.id);
  saveActivityHeader(db, headerFromLive(live));
  // Backfill old AsyncStorage autosaves once, before switching to the slim form.
  if (max < live.recordedPoints.length) {
    const missing = live.recordedPoints.slice(max).map(toNewTrackPoint);
    backfillTrackPoints(db, live.id, missing, max + 1);
    max = live.recordedPoints.length;
  }
  trackCursor = { activityId: live.id, nextSeq: nextSeqAfterMax(max) };
  return trackCursor.nextSeq;
}

function initializeTrackPersistence(live: LiveActivity): boolean {
  if (trackPersistenceUnavailable) return false;
  try {
    ensureTrackReady(live);
    return true;
  } catch (error) {
    // SQLite is native-only in this app. Keep web/tsx and old clients on the
    // existing AsyncStorage path, while surfacing failures from an opened DB.
    if (trackDb === null) {
      trackPersistenceUnavailable = true;
      return false;
    }
    throw error;
  }
}

function saveLiveForPersistence(live: LiveActivity): Promise<void> {
  return trackPersistenceUnavailable ? saveLive(live) : saveLiveHeader(live);
}

function loadFullTrack(live: LiveActivity): LiveActivity {
  try {
    const db = getTrackDb();
    const total = countTrackPoints(db, live.id);
    if (total === 0) return live;
    const all: LiveActivity["recordedPoints"] = [];
    const pageSize = 2000;
    for (let offset = 0; offset < total; offset += pageSize) {
      all.push(
        ...getTrackPointsPage(db, live.id, pageSize, offset).map((row) => ({
          lat: row.lat,
          lng: row.lng,
          altitude: row.altitude ?? undefined,
          accuracy: row.accuracy ?? undefined,
          speed: row.speed ?? undefined,
          timestamp: row.timestamp,
        })),
      );
    }
    return { ...live, recordedPoints: all };
  } catch {
    return live;
  }
}

export async function restoreLiveSession(): Promise<LiveActivity | null> {
  const restored = await loadLive();
  if (!restored) return null;
  if (restored.recordedPoints.length > 0) {
    try {
      ensureTrackReady(restored);
      const totalDistanceKm = restored.totalDistanceKm ?? accumulatedDistanceKm(
        restored.recordedPoints,
        {
          minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
          maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
        },
      );
      return {
        ...restored,
        recordedPoints: sliceWindow(restored.recordedPoints),
        totalDistanceKm,
      };
    } catch {
      if (trackDb === null) {
        trackPersistenceUnavailable = true;
      } else {
        throw new Error(
          "No se pudo recuperar el track local. Reintenta para continuar el backfill.",
        );
      }
    }
    return restored;
  }
  try {
    const db = getTrackDb();
    const rows = getLastTrackPoints(db, restored.id, TRACK_WINDOW_SIZE);
    return restoreLiveFromHeader(restored, () => rows.map((row) => ({
      lat: row.lat,
      lng: row.lng,
      altitude: row.altitude ?? undefined,
      accuracy: row.accuracy ?? undefined,
      speed: row.speed ?? undefined,
      timestamp: row.timestamp,
    })));
  } catch {
    trackPersistenceUnavailable = true;
    return restored;
  }
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
    const restored = await restoreLiveSession();
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
      if (initializeTrackPersistence(live)) await saveLiveHeader(live);
      else await saveLive(live);
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
      if (initializeTrackPersistence(live)) await saveLiveHeader(live);
      else await saveLive(live);
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
      if (initializeTrackPersistence(live)) await saveLiveHeader(live);
      else await saveLive(live);
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
      if (initializeTrackPersistence(updated)) await saveLiveHeader(updated);
      else await saveLive(updated);
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
      const persistence = resolvePointPersistence(live, point);
      const updated = await RecordPointUseCase(live, point);
      if (persistence.action === "insert") {
        if (trackPersistenceUnavailable) {
          await saveLive(updated);
          set({ live: updated });
          return;
        }
        const db = getTrackDb();
        const seq = ensureTrackReady(live);
        insertTrackPoint(db, live.id, seq, toNewTrackPoint(point));
        if (trackCursor) trackCursor.nextSeq = seq + 1;
        const previous = live.recordedPoints[live.recordedPoints.length - 1];
        const distance = live.totalDistanceKm ?? accumulatedDistanceKm(live.recordedPoints, {
          minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
          maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
        });
        const tracked: LiveActivity = {
          ...updated,
          recordedPoints: sliceWindow(updated.recordedPoints),
          totalDistanceKm: previous ? distance + haversineKm(previous, point) : distance,
        };
        await saveLiveHeader(tracked);
        set({ live: tracked });
      } else {
        // Rejected fixes can still update checkpoint/updatedAt state, but do not
        // create a SQLite row or inflate the in-memory window.
        await saveLiveForPersistence(updated);
        set({ live: updated });
      }
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
      await saveLiveForPersistence(updated);
      if (trackDb) updateActivityHeader(trackDb, updated.id, {
        status: updated.phase,
        updatedAt: updated.updatedAt,
      });
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
      await saveLiveForPersistence(updated);
      if (trackDb) updateActivityHeader(trackDb, updated.id, {
        status: updated.phase,
        updatedAt: updated.updatedAt,
      });
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
      await saveLiveForPersistence(activity);
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
      // The in-memory value is a bounded recovery window. Rehydrate the full
      // SQLite track before GPX generation and local-first completion.
      const fullLive = loadFullTrack(live);
      let localHistory = (await loadUnsynced()) ?? [];
      const finished = await FinishActivityUseCase(fullLive, {
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
      try {
        const db = getTrackDb();
        updateActivityHeader(db, result.saved.id, {
          status: "finished",
          finishedAt: result.activity.finishedAt ?? Date.now(),
          distanceKm: result.saved.distanceCoveredKm,
          durationSec: result.saved.durationSeconds,
          updatedAt: Date.now(),
        });
      } catch {
        // SQLite is an optimization for recovery; the local archive is already durable.
      }
      void activityService.createActivity({ ...result.saved, isSynced: true })
        .then(() => enqueue(async () => {
          const history = ((await loadUnsynced()) ?? []).map((a) =>
            a.id === result.saved.id ? { ...a, isSynced: true } : a);
          await saveUnsynced(history);
          set({ unsynced: history.filter((a) => !a.isSynced) });
          if (trackDb) updateActivityHeader(trackDb, result.saved.id, { synced: 1, updatedAt: Date.now() });
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
    const activityId = get().live?.id;
    await AsyncStorage.removeItem(AUTOSAVE_KEY);
    if (activityId && trackDb) {
      try {
        deleteTrackDbActivity(trackDb, activityId);
      } finally {
        if (trackCursor?.activityId === activityId) trackCursor = null;
      }
    }
    set({ live: null, lastResult: null, error: null });
  }),

  clearError: () => set({ error: null }),
}));
