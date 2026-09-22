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
  type LocationAccuracyOptions,
} from "../location/locationService";
import { StartActivityUseCase } from "../../core/application/activity/StartActivity.usecase";
import {
  StartFreeRecordingUseCase,
  type FreeRecordingPosition,
} from "../../core/application/activity/StartFreeRecording.usecase";
import { BeginTrackingUseCase } from "../../core/application/activity/BeginTracking.usecase";
import {
  RecordPointUseCase,
  classifyPointDiscard,
} from "../../core/application/activity/RecordPoint.usecase";
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
import { isResumableLive } from "../../core/domain/activity";
import { distanceM } from "../../core/domain/calculations";
import {
  openTrackDbConnection,
  migrateTrackDb,
  saveActivityHeader,
  updateActivityHeader,
  insertTrackPoint,
  getMaxSeq,
  countTrackPoints,
  getLastTrackPoints,
  getTrackPointsPage,
} from "../database/activityTrackDb";
import type {
  ActivityHeader,
  NewTrackPoint,
  TrackDbConnection,
} from "../database/activityTrackDb";
import {
  accumulatedDistanceKm,
  haversineKm,
} from "../../core/domain/calculations";
import { ACTIVITY_CONFIG } from "../../core/domain/activity";

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

/**
 * ETAPA 3 — Autosave reducido: persiste estado/cabecera SIN el track.
 * SQLite es la fuente del track. Misma clave (lectores compatibles).
 */
function saveLiveHeader(live: LiveActivity): Promise<void> {
  return appStorage.setItem(
    AUTOSAVE_KEY,
    JSON.stringify(slimLiveForAutosave(live)),
  );
}

/**
 * ETAPA 3 — Restaura una sesión reanudable: cabecera de AsyncStorage +
 * ventana desde SQLite (legacy con array: tal cual). Exportada para las vistas.
 */
export async function restoreLiveSession(): Promise<LiveActivity | null> {
  const raw = await appStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return null;
  let parsed: LiveActivity;
  try {
    parsed = JSON.parse(raw) as LiveActivity;
  } catch {
    return null;
  }
  if (!isResumableLive(parsed)) {
    await appStorage.removeItem(AUTOSAVE_KEY);
    return null;
  }
  if (parsed.recordedPoints.length > 0) {
    return parsed;
  }
  try {
    ensureTrackReady(parsed);
    const db = getTrackDb();
    const rows = getLastTrackPoints(db, parsed.id, TRACK_WINDOW_SIZE);
    return restoreLiveFromHeader(parsed, () =>
      rows.map((r) => ({
        lat: r.lat,
        lng: r.lng,
        altitude: r.altitude ?? undefined,
        timestamp: r.timestamp,
      })),
    );
  } catch {
    return parsed;
  }
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

/**
 * ETAPA 2 SQLite — conexión perezosa única + cursor de `seq` en memoria.
 * `trackCursor` guarda el próximo `seq` de la actividad activa; se recalcula
 * con `MAX(seq)` al cambiar de actividad o reiniciar (nunca `COUNT(*)` por fix).
 */
let trackDbConn: TrackDbConnection | null = null;
let trackCursor: { activityId: string; nextSeq: number } | null = null;

function getTrackDb(): TrackDbConnection {
  if (!trackDbConn) {
    trackDbConn = openTrackDbConnection();
    migrateTrackDb(trackDbConn);
  }
  return trackDbConn;
}

function toNewTrackPoint(p: {
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  timestamp?: number;
}): NewTrackPoint {
  return {
    lat: p.lat,
    lng: p.lng,
    altitude: p.altitude ?? null,
    accuracy: p.accuracy ?? null,
    speed: p.speed ?? null,
    timestamp: p.timestamp ?? Date.now(),
  };
}

function headerFromLive(live: LiveActivity): ActivityHeader {
  const now = Date.now();
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
    updatedAt: now,
  };
}

/**
 * ETAPA 2 — Asegura cabecera + cursor para una actividad (idempotente).
 * Si SQLite está vacío pero la memoria trae puntos (sesiones previas a la
 * ETAPA 2), los inserta como backfill con `seq` 1..N. Lanza si falla el DB.
 */
export function ensureTrackReady(
  live: LiveActivity,
  db?: TrackDbConnection,
): number {
  if (trackCursor?.activityId === live.id) {
    return trackCursor.nextSeq;
  }
  const conn = db ?? getTrackDb();
  let max = getMaxSeq(conn, live.id);
  // Cabecera ANTES del backfill (FK parent debe existir).
  saveActivityHeader(conn, headerFromLive(live));
  if (max === 0 && live.recordedPoints.length > 0) {
    live.recordedPoints.forEach((pt, i) => {
      insertTrackPoint(conn, live.id, i + 1, toNewTrackPoint(pt));
    });
    max = live.recordedPoints.length;
  }
  // Header defensivo (los inicios normales ya lo crearon vía init).
  saveActivityHeader(conn, headerFromLive(live));
  trackCursor = { activityId: live.id, nextSeq: max + 1 };
  return max + 1;
}

/** Lee el track completo desde SQLite (paginado); fallback a memoria. */
function loadFullTrackPoints(live: LiveActivity): LiveActivity {
  try {
    const db = getTrackDb();
    const total = countTrackPoints(db, live.id);
    if (total === 0) return live;
    const all: LiveActivity["recordedPoints"] = [];
    const PAGE = 2000;
    for (let offset = 0; offset < total; offset += PAGE) {
      const page = getTrackPointsPage(db, live.id, PAGE, offset);
      for (const row of page) {
        all.push({
          lat: row.lat,
          lng: row.lng,
          altitude: row.altitude ?? undefined,
          timestamp: row.timestamp,
        });
      }
    }
    return { ...live, recordedPoints: all };
  } catch {
    return live;
  }
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

/**
 * DIAG-TEMP — Telemetría GPS temporal (solo memoria, no se persiste).
 * `received` = fixes entregados por el watcher antes de filtros.
 * Invariante: received == accepted + accuracy + tooClose + tooFar + invalid.
 */
export interface GpsStats {
  received: number;
  accepted: number;
  discardedAccuracy: number;
  discardedTooClose: number;
  discardedTooFar: number;
  discardedInvalid: number;
  lastReason: string | null;
}

/**
 * DIAG-TEMP — Telemetría RAW detallada por callback de expo-location.
 * Captura lo que llega ANTES de cualquier filtro de distancia/precisión.
 */
export interface RawGpsTelemetry {
  /** Timestamp del callback RAW (ms epoch). */
  timestamp: number;
  /** Segundos desde el callback RAW anterior. */
  secondsSincePrev: number | null;
  /** Latitud en grados. */
  latitude: number;
  /** Longitud en grados. */
  longitude: number;
  /** Precisión horizontal en metros (undefined si no disponible). */
  accuracy: number | undefined;
  /** Velocidad en m/s (undefined si no disponible). */
  speed: number | undefined;
  /** Distancia en metros desde el callback RAW anterior. */
  distanceFromPrevM: number | null;
  /** Resultado del filtro actual. */
  filterResult:
    | "ACCEPTED"
    | "TOO_CLOSE"
    | "TOO_FAR"
    | "ACCURACY"
    | "INVALID"
    | "INVALID_PHASE"
    | "INVALID_SCHEMA"
    | "PENDING";
  /** Índice secuencial del callback RAW. */
  rawIndex: number;
}

export interface GpsEvent {
  t: string;
  type: string;
}

const EMPTY_GPS_STATS: GpsStats = {
  received: 0,
  accepted: 0,
  discardedAccuracy: 0,
  discardedTooClose: 0,
  discardedTooFar: 0,
  discardedInvalid: 0,
  lastReason: null,
};

function diagTime(): string {
  return new Date().toLocaleTimeString("es-BO", { hour12: false });
}

function pushDiagEvent(prev: GpsEvent[], type: string): GpsEvent[] {
  return [...prev.slice(-19), { t: diagTime(), type }];
}

const MAX_RAW_TELEMETRY = 200;

function pushRawGpsTelemetry(
  prev: RawGpsTelemetry[],
  entry: RawGpsTelemetry,
): RawGpsTelemetry[] {
  return [...prev.slice(-(MAX_RAW_TELEMETRY - 1)), entry];
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
  /** DIAG-TEMP — solo memoria. */
  gpsStats: GpsStats;
  /** DIAG-TEMP — últimos 20 eventos de ciclo de vida GPS. */
  gpsEvents: GpsEvent[];
  /** DIAG-TEMP — telemetría RAW detallada (últimos 200 callbacks). */
  rawGpsTelemetry: RawGpsTelemetry[];
  /** DIAG-TEMP — timestamp del último callback RAW para calcular delta. */
  lastRawTimestamp: number | null;
  /** DIAG-TEMP — coordenadas del último callback RAW para calcular distancia. */
  lastRawCoords: { lat: number; lng: number } | null;
  /** DIAG-TEMP — contador secuencial de callbacks RAW. */
  rawGpsCounter: number;

  loadCatalog: () => Promise<void>;
  startRoute: (
    uid: string,
    userName: string,
    routeId: string,
  ) => Promise<boolean>;
  startFreeRecording: (
    position: FreeRecordingPosition,
    uid: string,
    userName: string,
  ) => Promise<boolean>;
  beginTracking: () => Promise<boolean>;
  /**
   * ETAPA 2 — Prepara persistencia SQLite para una actividad grabable:
   * cabecera + semillas + cursor + total=0. Usada por los 3 inicios
   * (route/free/plan). Falla cerrado si el DB no responde.
   */
  initTrackPersistence: (live: LiveActivity) => Promise<boolean>;
  recordPoint: (p: GpsPosition) => Promise<void>;
  pauseActivity: () => Promise<boolean>;
  resumeActivity: () => Promise<boolean>;
  finishActivity: () => Promise<FinishActivityResult | null>;
  addCheckpoint: (input: AddCheckpointInput) => Promise<boolean>;
  startWatch: (options?: LocationAccuracyOptions) => Promise<boolean>;
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
  gpsStats: { ...EMPTY_GPS_STATS },
  gpsEvents: [],
  rawGpsTelemetry: [],
  lastRawTimestamp: null,
  lastRawCoords: null,
  rawGpsCounter: 0,

  loadCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      // Restaurar actividad persistida (no se pierde al salir de la pantalla),
      // pero solo si está en curso o pausada. Una selección sin iniciar (ready)
      // o una actividad ya cerrada (finished) vuelve a mostrar el catálogo.
      // ETAPA 3 — cabecera de AsyncStorage + ventana desde SQLite.
      const restored = await restoreLiveSession();
      if (restored) {
        set({ live: restored });
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
      await saveLiveHeader(live);
      // DIAG-TEMP — telemetría limpia por actividad.
      set({
        live,
        isLoading: false,
        gpsStats: { ...EMPTY_GPS_STATS },
        gpsEvents: [],
      });
      return get().initTrackPersistence(live);
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

  startFreeRecording: async (position, uid, userName) => {
    set({ isLoading: true, error: null });
    try {
      const prepared = StartFreeRecordingUseCase({
        position,
        userId: uid,
        userName,
      });
      const live = await BeginTrackingUseCase(prepared);
      return get().initTrackPersistence(live);
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
  },

  initTrackPersistence: async (live) => {
    try {
      const tracked: LiveActivity = {
        ...live,
        totalDistanceKm: live.totalDistanceKm ?? 0,
      };
      ensureTrackReady(tracked);
      await saveLiveHeader(tracked);
      set({
        live: tracked,
        isLoading: false,
        gpsStats: { ...EMPTY_GPS_STATS },
        gpsEvents: [],
        rawGpsTelemetry: [],
        lastRawTimestamp: null,
        lastRawCoords: null,
        rawGpsCounter: 0,
      });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "No se pudo preparar el almacenamiento local.",
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
      await saveLiveHeader(updated);
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
    // DIAG-TEMP — contar el fix ANTES de cualquier filtro.
    const stats = { ...get().gpsStats, received: get().gpsStats.received + 1 };

    // DIAG-TEMP RAW — calcular telemetría del callback crudo.
    const now = p.timestamp ?? Date.now();
    const state = get();
    const prevTs = state.lastRawTimestamp;
    const prevCoords = state.lastRawCoords;
    const rawIndex = state.rawGpsCounter + 1;

    let secondsSincePrev: number | null = null;
    let distanceFromPrevM: number | null = null;
    if (prevTs != null) {
      secondsSincePrev = (now - prevTs) / 1000;
    }
    if (prevCoords != null) {
      distanceFromPrevM = distanceM(
        { lat: prevCoords.lat, lng: prevCoords.lng },
        { lat: p.latitude, lng: p.longitude },
      );
    }

    // DIAG-TEMP — clasificar con las mismas reglas del use case (solo lectura).
    let filterResult: RawGpsTelemetry["filterResult"] = "PENDING";
    if (!live || live.phase !== "in_progress") {
      stats.discardedInvalid += 1;
      stats.lastReason = "INVALID_PHASE";
      filterResult = "INVALID_PHASE";
    } else {
      const point = {
        lat: p.latitude,
        lng: p.longitude,
        timestamp: p.timestamp,
        accuracy: p.accuracy,
        altitude: p.altitude,
        speed: p.speed,
      };
      const verdict = classifyPointDiscard(live, point);
      stats.lastReason =
        verdict === "accepted"
          ? "ACCEPTED"
          : verdict === "low_accuracy"
            ? "ACCURACY"
            : verdict === "jitter"
              ? "TOO_CLOSE"
              : verdict === "jump"
                ? "TOO_FAR"
                : "INVALID";
      if (verdict === "accepted") {
        stats.accepted += 1;
        filterResult = "ACCEPTED";
      } else if (verdict === "low_accuracy") {
        stats.discardedAccuracy += 1;
        filterResult = "ACCURACY";
      } else if (verdict === "jitter") {
        stats.discardedTooClose += 1;
        filterResult = "TOO_CLOSE";
      } else if (verdict === "jump") {
        stats.discardedTooFar += 1;
        filterResult = "TOO_FAR";
      } else {
        stats.discardedInvalid += 1;
        filterResult = "INVALID";
      }
    }

    // DIAG-TEMP RAW — registrar telemetría cruda.
    const rawEntry: RawGpsTelemetry = {
      timestamp: now,
      secondsSincePrev,
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      speed: p.speed,
      distanceFromPrevM,
      filterResult,
      rawIndex,
    };
    const newRawTelemetry = pushRawGpsTelemetry(
      state.rawGpsTelemetry,
      rawEntry,
    );

    set({
      gpsStats: stats,
      rawGpsTelemetry: newRawTelemetry,
      lastRawTimestamp: now,
      lastRawCoords: { lat: p.latitude, lng: p.longitude },
      rawGpsCounter: rawIndex,
    });

    if (!live || live.phase !== "in_progress") {
      return;
    }

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
      const plan = resolvePointPersistence(live, point);
      if (plan.action === "insert") {
        // ETAPA 2 — SQLite confirma ANTES de avanzar Zustand.
        try {
          const db = getTrackDb();
          const seq = ensureTrackReady(live);
          insertTrackPoint(db, live.id, seq, toNewTrackPoint(point));
          if (trackCursor) trackCursor.nextSeq = seq + 1;
          const prev =
            live.recordedPoints.length > 0
              ? live.recordedPoints[live.recordedPoints.length - 1]
              : point;
          const base =
            live.totalDistanceKm ??
            accumulatedDistanceKm(live.recordedPoints, {
              minDeltaM: ACTIVITY_CONFIG.MIN_GPS_DELTA_M,
              maxJumpM: ACTIVITY_CONFIG.MAX_GPS_JUMP_M,
            });
          const tracked: LiveActivity = {
            ...updated,
            recordedPoints: sliceWindow(
              updated.recordedPoints,
              TRACK_WINDOW_SIZE,
            ),
            totalDistanceKm: base + haversineKm(prev, point),
          };
          await saveLiveHeader(tracked);
          set({ live: tracked });
        } catch (dbErr) {
          set({
            error:
              dbErr instanceof Error
                ? dbErr.message
                : "No se pudo guardar el punto GPS localmente.",
          });
          return;
        }
      } else {
        await saveLiveHeader(updated);
        set({ live: updated });
      }
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
      await saveLiveHeader(updated);
      // DIAG-TEMP
      set({
        live: updated,
        gpsEvents: pushDiagEvent(get().gpsEvents, "paused"),
      });
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
      await saveLiveHeader(updated);
      // DIAG-TEMP
      set({
        live: updated,
        gpsEvents: pushDiagEvent(get().gpsEvents, "resumed"),
      });
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
      await saveLiveHeader(activity);
      set({ live: activity });
      return true;
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error ? err.message : "No se pudo registrar la parada",
      });
      return false;
    }
  },

  finishActivity: async () => {
    const live = get().live;
    if (!live) return null;
    set({ finishing: true, error: null });
    get().stopWatch();
    // ETAPA 2 — rehidratar el track completo desde SQLite (la memoria solo
    // guarda ventana). Si SQLite está vacío/falla, se usa la memoria tal cual.
    const fullLive = loadFullTrackPoints(live);
    try {
      const result = await FinishActivityUseCase(fullLive, {
        saveActivity: activityService.createActivity,
        saveLocalActivity: saveLive,
      });
      // ETAPA 2 — cerrar cabecera local (no bloquea el resultado si falla).
      try {
        const db = getTrackDb();
        updateActivityHeader(db, live.id, {
          status: "finished",
          finishedAt: result.activity.finishedAt ?? Date.now(),
          distanceKm: result.saved.distanceCoveredKm,
          durationSec: result.saved.durationSeconds,
          synced: 1,
          updatedAt: Date.now(),
        });
      } catch {
        // Solo bookkeeping local.
      }
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
        ...loadFullTrackPoints(liveNow),
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

  startWatch: async (options) => {
    get().stopWatch();
    const sub = await locationService.startWatching((p) => {
      get().recordPoint(p);
    }, options);
    // DIAG-TEMP — null = sin permiso o fallo de suscripción.
    set({
      watch: sub,
      gpsEvents: pushDiagEvent(
        get().gpsEvents,
        sub != null ? "watch_start ok" : "watch_start fail/null",
      ),
    });
    return sub != null;
  },

  stopWatch: () => {
    const { watch } = get();
    // DIAG-TEMP — solo se registra si había suscripción activa.
    if (watch) {
      locationService.stopWatching(watch);
      set({
        watch: null,
        gpsEvents: pushDiagEvent(get().gpsEvents, "watch_stop"),
      });
    } else {
      set({ watch: null });
    }
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
    set({
      live: null,
      lastResult: null,
      error: null,
      rawGpsTelemetry: [],
      lastRawTimestamp: null,
      lastRawCoords: null,
      rawGpsCounter: 0,
    });
    await appStorage.removeItem(AUTOSAVE_KEY);
  },

  clearError: () => set({ error: null }),
}));
