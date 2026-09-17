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

export interface TrekMapScene {
  trail: LngLat[];
  track: LngLat[];
  markers: SceneMarker[];
  bounds: [LngLat, LngLat] | null;
  interactive: boolean;
  styleUrl: string;
}

export type MapToHostEvent =
  | { type: "mapReady" }
  | { type: "mapPress"; payload: { lat: number; lng: number } }
  | { type: "error"; payload: { message: string } };
