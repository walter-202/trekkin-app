import type { Coordinates } from "../../../core/domain/types";
import { computeBoundingBox } from "../../../core/domain/geoBounds";
import type {
  TrekMapScene,
  SceneMarker,
} from "../../../infrastructure/map/mapBridge";
import { ONLINE_STYLE_URL } from "../../../infrastructure/map/mapStyle";
import type { TrekMapProps, MapMarker } from "./TrekMap.types";

const toLngLat = (p: { lat: number; lng: number }): [number, number] => [
  p.lng,
  p.lat,
];

function boundsFromPoints(
  points: Array<{ lat: number; lng: number }>,
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  const box = computeBoundingBox(points, 0.2);
  return [
    [box.minLng, box.minLat],
    [box.maxLng, box.maxLat],
  ];
}

/**
 * Normaliza TrekMapProps al escenario que pintan WebView y MapLibre GL JS.
 */
export function buildTrekMapScene(props: TrekMapProps): TrekMapScene {
  const trail = (props.trail ?? []).map(toLngLat);
  const track = (props.track ?? []).map(toLngLat);

  const markers: SceneMarker[] = [];
  if (props.start) {
    markers.push({
      id: "start",
      lat: props.start.lat,
      lng: props.start.lng,
      kind: "start",
      label: props.start.name,
      notes: "Inicio de la caminata",
    });
  }
  if (props.end) {
    markers.push({
      id: "end",
      lat: props.end.lat,
      lng: props.end.lng,
      kind: "end",
      label: props.end.name,
      notes: "Fin de la caminata",
    });
  }

  const extra: MapMarker[] = [
    ...(props.markers ?? []),
    ...(props.pointsOfInterest ?? []),
  ];
  for (const m of extra) {
    if (markers.some((x) => x.id === m.id)) continue;
    markers.push({
      id: m.id,
      lat: m.lat,
      lng: m.lng,
      kind:
        m.type === "user"
          ? "user"
          : m.type === "start"
            ? "start"
            : m.type === "end"
              ? "end"
              : "checkpoint",
      label: m.name,
      notes: m.notes || m.category,
    });
  }

  if (props.currentLocation) {
    markers.push({
      id: "user-location",
      lat: props.currentLocation.lat,
      lng: props.currentLocation.lng,
      kind: "user",
      label: "Mi posición",
    });
  }

  const fitPoints: Array<{ lat: number; lng: number }> =
    props.fitTo && props.fitTo.length > 0
      ? props.fitTo
      : [...(props.trail ?? []), ...(props.track ?? []), ...markers];

  return {
    trail,
    track,
    markers,
    bounds: boundsFromPoints(fitPoints),
    interactive: props.interactive !== false,
    styleUrl: ONLINE_STYLE_URL,
    followUser: props.followUser,
  };
}

export function sceneHasGeometry(scene: TrekMapScene): boolean {
  return (
    scene.trail.length > 0 || scene.track.length > 0 || scene.markers.length > 0
  );
}

export type { Coordinates };
