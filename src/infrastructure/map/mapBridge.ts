/**
 * Protocolo RN ↔ MapLibre (WebView nativo o GL JS en web).
 * Las vistas no hablan con el motor: mandan TrekMapScene.
 */

export type LngLat = [number, number];

export type SceneMarkerKind = "start" | "end" | "checkpoint" | "user";

export interface SceneMarker {
  id: string;
  lat: number;
  lng: number;
  kind: SceneMarkerKind;
  label?: string;
  notes?: string;
}

export interface TrekMapOfflinePack {
  kind: "pmtiles" | "mbtiles";
  protocolUrl: string | null;
  message: string | null;
}

export interface TrekMapScene {
  trail: LngLat[];
  track: LngLat[];
  markers: SceneMarker[];
  bounds: [LngLat, LngLat] | null;
  interactive: boolean;
  styleUrl: string;
  /** Pack de fondo HU-04. Null = estilo online OpenFreeMap. */
  offlinePack: TrekMapOfflinePack | null;
}

export type MapToHostEvent =
  | { type: "mapReady"; payload?: { offlinePackReady?: boolean } }
  | { type: "mapPress"; payload: { lat: number; lng: number } }
  | { type: "error"; payload: { message: string } };
