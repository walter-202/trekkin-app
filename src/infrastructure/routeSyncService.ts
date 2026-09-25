import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteSchema } from "../core/domain/route.schemas";
import type { RouteModel } from "../core/domain/types";

const LOCAL_ROUTES_KEY = "local_routes_v1";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api.trekkin.app";

type BackendRoutePayload = {
  id?: string;
  title: string;
  description: string;
  region: string;
  startPoint: { name: string; lat: number; lng: number };
  endPoint: { name: string; lat: number; lng: number };
  distanceKm: number;
  durationMinutes: number;
  elevationGainM?: number;
  difficulty: RouteModel["difficulty"];
  terrainType?: RouteModel["terrainType"];
  notes?: string;
  weather?: RouteModel["weather"];
  modality: RouteModel["modality"];
  status: RouteModel["status"];
  creatorId: string;
  creatorName: string;
  waypoints: RouteModel["waypoints"];
  checkpoints: RouteModel["checkpoints"];
  photos: string[];
  createdAt: number;
  updatedAt: number;
};

export class RouteSyncService {
  private unsubscribe: (() => void) | null = null;
  private isOnline = false;

  start(): () => void {
    this.unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );

      if (online && !this.isOnline) {
        void this.syncPendingRoutes();
      }

      this.isOnline = online;
    });

    return () => this.stop();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async isNetworkAvailable(): Promise<boolean> {
    const state: NetInfoState = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  }

  async getPendingRoutes(): Promise<RouteModel[]> {
    const raw = await AsyncStorage.getItem(LOCAL_ROUTES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown[];

    const routes: RouteModel[] = parsed.flatMap((item) => {
      const result = RouteSchema.safeParse(item);
      return result.success ? [result.data as RouteModel] : [];
    });

    return routes.filter((route) => !route.syncStatus);
  }

  async saveRoutes(routes: RouteModel[]): Promise<void> {
    await AsyncStorage.setItem(LOCAL_ROUTES_KEY, JSON.stringify(routes));
  }

  async saveSingleRoute(route: RouteModel): Promise<void> {
    const all = await this.loadAllRoutes();
    const next = all.filter((item) => item.id !== route.id);
    next.push(route);
    await this.saveRoutes(next);
  }

  async loadAllRoutes(): Promise<RouteModel[]> {
    const raw = await AsyncStorage.getItem(LOCAL_ROUTES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown[];
    return parsed
      .map((item) => RouteSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data);
  }

  private toBackendPayload(route: RouteModel): BackendRoutePayload {
    return {
      id: route.remoteId ?? route.id,
      title: route.title,
      description: route.description,
      region: route.region,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      elevationGainM: route.elevationGainM,
      difficulty: route.difficulty,
      terrainType: route.terrainType,
      notes: route.notes,
      weather: route.weather,
      modality: route.modality,
      status: route.status,
      creatorId: route.creatorId,
      creatorName: route.creatorName,
      waypoints: route.waypoints,
      checkpoints: route.checkpoints,
      photos: route.photos,
      createdAt: route.createdAt,
      updatedAt: Date.now(),
    };
  }

  async syncPendingRoutes(): Promise<number> {
    const online = await this.isNetworkAvailable();
    if (!online) return 0;

    const pending = await this.getPendingRoutes();
    if (pending.length === 0) return 0;

    let synced = 0;

    for (const route of pending) {
      try {
        const response = await fetch(`${API_URL}/routes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_API_TOKEN ?? ""}`,
          },
          body: JSON.stringify(this.toBackendPayload(route)),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as { id?: string };

        const updatedRoute: RouteModel = {
          ...route,
          remoteId: data.id ?? route.remoteId ?? route.id,
          syncStatus: true,
          lastSyncAt: Date.now(),
          updatedAt: Date.now(),
        };

        await this.saveSingleRoute(updatedRoute);
        synced += 1;
      } catch (error) {
        console.warn("Route sync failed:", error);
        // No cambia a sincronizado si el backend rechazó la petición.
      }
    }

    return synced;
  }
}

export const routeSyncService = new RouteSyncService();