/** Decides when an offline detail should replace the vector renderer with GPX geometry. */
export interface OfflineMapFallbackState {
  hasLocalPack: boolean;
  mapReady: boolean;
  mapError: boolean;
  timedOut: boolean;
}

export function shouldUseOfflineTrailFallback(state: OfflineMapFallbackState): boolean {
  return state.hasLocalPack && !state.mapReady && (state.mapError || state.timedOut);
}
