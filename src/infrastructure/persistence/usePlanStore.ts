import { create } from 'zustand';
import type { PlannedPoint, RoutePlan } from '../../core/domain/plan';
import type {
  RouteDifficulty,
  RouteModel,
  RouteWeather,
  TerrainType,
} from '../../core/domain/types';
import { appStorage } from './storage';
import { routeService } from '../database/routeService';
import { InitializePlanUseCase } from '../../core/application/plan/InitializePlan.usecase';
import { SetPlanPointsUseCase } from '../../core/application/plan/SetPlanPoints.usecase';
import { SaveDraftUseCase } from '../../core/application/plan/SaveDraft.usecase';
import { ListDraftsUseCase } from '../../core/application/plan/ListDrafts.usecase';
import { GetDraftUseCase } from '../../core/application/plan/GetDraft.usecase';
import { UpdatePlanUseCase } from '../../core/application/plan/UpdatePlan.usecase';
import { ConfirmStartPointUseCase } from '../../core/application/plan/ConfirmStartPoint.usecase';
import { MarkReadyForGpsUseCase } from '../../core/application/plan/MarkReadyForGps.usecase';

/**
 * HU-07 — Estado de planificación (zustand) con autosave local.
 * El plan completo se guarda en AsyncStorage (clave trekking_plan_autosave)
 * para no perder la información al salir (T5). Firestore se sincroniza
 * según corresponda a través de los casos de uso.
 */
const AUTOSAVE_KEY = 'trekking_plan_autosave';

function saveLocalPlan(plan: RoutePlan): Promise<void> {
  return appStorage.setItem(AUTOSAVE_KEY, JSON.stringify(plan));
}

function loadLocalPlan(): Promise<RoutePlan | null> {
  return appStorage.getItem(AUTOSAVE_KEY).then((raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RoutePlan;
    } catch {
      return null;
    }
  });
}

interface PlanState {
  plan: RoutePlan | null;
  drafts: RouteModel[];
  isLoading: boolean;
  saving: boolean;
  error: string | null;
  lastSavedAt: number | null;
  initializePlan: (uid: string, creatorName: string, forceNew?: boolean) => Promise<void>;
  newDraftPlan: (uid: string, creatorName: string) => Promise<void>;
  setPoints: (start: PlannedPoint, end: PlannedPoint) => Promise<boolean>;
  setPlanMeta: (updates: {
    title?: string;
    difficulty?: RouteDifficulty;
    terrainType?: TerrainType;
    notes?: string;
    weather?: RouteWeather;
    waypoints?: RoutePlan['waypoints'];
  }) => void;
  saveDraft: () => Promise<boolean>;
  listDrafts: (uid: string) => Promise<void>;
  loadDraft: (id: string, uid: string) => Promise<boolean>;
  updatePlan: () => Promise<boolean>;
  confirmStart: (start: PlannedPoint) => Promise<boolean>;
  markReadyForGps: () => Promise<boolean>;
  clearPlan: () => Promise<void>;
  clearError: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plan: null,
  drafts: [],
  isLoading: false,
  saving: false,
  error: null,
  lastSavedAt: null,

  initializePlan: async (uid, creatorName, forceNew = false) => {
    set({ isLoading: true, error: null });
    try {
      const plan = await InitializePlanUseCase({ uid, creatorName, forceNew }, { loadLocalPlan });
      set({ plan, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message ?? 'Error al iniciar la planificación', isLoading: false });
    }
  },

  newDraftPlan: async (uid, creatorName) => {
    const plan = await InitializePlanUseCase({ uid, creatorName, forceNew: true }, { loadLocalPlan });
    await saveLocalPlan(plan);
    set({ plan, error: null });
  },

  setPoints: async (start, end) => {
    const plan = get().plan;
    if (!plan) return false;
    set({ saving: true, error: null });
    try {
      const updated = await SetPlanPointsUseCase({ plan, start, end }, { saveLocalPlan });
      set({ plan: updated, saving: false });
      return true;
    } catch (err: any) {
      set({ error: err?.message ?? 'No se pudieron guardar los puntos', saving: false });
      return false;
    }
  },

  setPlanMeta: (updates) => {
    const plan = get().plan;
    if (!plan) return;
    const next: RoutePlan = { ...plan, ...updates, updatedAt: Date.now() };
    saveLocalPlan(next);
    set({ plan: next });
  },

  saveDraft: async () => {
    const plan = get().plan;
    if (!plan) return false;
    set({ saving: true, error: null });
    try {
      const saved = await SaveDraftUseCase(
        { plan, defaultTitle: 'Nueva ruta' },
        { saveDraft: routeService.createDraft, saveLocalPlan }
      );
      set({ plan: saved, saving: false, lastSavedAt: Date.now() });
      return true;
    } catch (err: any) {
      set({ error: err?.message ?? 'Error al guardar el borrador', saving: false });
      return false;
    }
  },

  listDrafts: async (uid) => {
    set({ isLoading: true, error: null });
    try {
      const drafts = await ListDraftsUseCase(uid, { listDrafts: routeService.listUserDrafts });
      set({ drafts, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message ?? 'No se pudieron cargar los borradores', isLoading: false });
    }
  },

  loadDraft: async (id, uid) => {
    set({ isLoading: true, error: null });
    try {
      const plan = await GetDraftUseCase(
        { uid, id },
        { getDraft: routeService.getRoute, loadLocalPlan }
      );
      set({ plan, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err?.message ?? 'No se pudo abrir el borrador', isLoading: false });
      return false;
    }
  },

  updatePlan: async () => {
    const plan = get().plan;
    if (!plan) return false;
    set({ saving: true, error: null });
    try {
      const updated = await UpdatePlanUseCase(plan, {
        updateDraft: routeService.updateRoute,
        saveLocalPlan,
      });
      set({ plan: updated, saving: false, lastSavedAt: Date.now() });
      return true;
    } catch (err: any) {
      set({ error: err?.message ?? 'No se pudo actualizar la planificación', saving: false });
      return false;
    }
  },

  confirmStart: async (start) => {
    const plan = get().plan;
    if (!plan) return false;
    set({ saving: true, error: null });
    try {
      const updated = await ConfirmStartPointUseCase(
        { plan, start },
        { updateDraft: routeService.updateRoute, saveLocalPlan }
      );
      set({ plan: updated, saving: false, lastSavedAt: Date.now() });
      return true;
    } catch (err: any) {
      set({ error: err?.message ?? 'No se pudo confirmar el punto de inicio', saving: false });
      return false;
    }
  },

  markReadyForGps: async () => {
    const plan = get().plan;
    if (!plan) return false;
    set({ saving: true, error: null });
    try {
      const updated = await MarkReadyForGpsUseCase(plan, {
        updateDraft: routeService.updateRoute,
        saveLocalPlan,
      });
      set({ plan: updated, saving: false, lastSavedAt: Date.now() });
      return true;
    } catch (err: any) {
      set({ error: err?.message ?? 'No se pudo preparar la ruta para grabación', saving: false });
      return false;
    }
  },

  clearPlan: async () => {
    set({ plan: null, error: null, lastSavedAt: null });
    await appStorage.removeItem(AUTOSAVE_KEY);
  },

  clearError: () => set({ error: null }),
}));