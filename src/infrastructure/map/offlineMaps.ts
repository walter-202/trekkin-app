import { OfflineManager } from '@maplibre/maplibre-react-native';

let initialized = false;

export function ensureMapOfflineCache(): void {
  if (initialized) return;
  initialized = true;
  try {
    OfflineManager.setTileCountLimit(1500);
  } catch {
    initialized = false;
  }
}