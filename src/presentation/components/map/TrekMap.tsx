/**
 * Punto de entrada para TypeScript. Metro resuelve:
 *   web    → TrekMap.web.tsx    (MapLibre GL JS en el DOM)
 *   native → TrekMap.native.tsx (MapLibre GL JS en WebView / Expo Go)
 */
export { TrekMap, default } from "./TrekMap.native";
export type { TrekMapProps, MapMarker, MapRegion } from "./TrekMap.types";
