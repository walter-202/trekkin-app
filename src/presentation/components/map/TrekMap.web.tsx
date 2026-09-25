import React, { createElement, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { AndeanTheme } from "../../theme";
import type { TrekMapProps } from "./TrekMap.types";
import { buildTrekMapScene } from "./buildTrekMapScene";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAPLIBRE_GL_CSS_URL,
  MAPLIBRE_GL_JS_URL,
  ONLINE_STYLE_URL,
  PMTILES_JS_URL,
  buildOfflineVectorStyle,
} from "../../../infrastructure/map/mapStyle";
import {
  shouldFitBounds,
  type TrekMapScene,
} from "../../../infrastructure/map/mapBridge";
import { buildCalloutHtml, CALLOUT_CSS } from "./markerCallout";

const PUCK_CSS = `
.trekkin-user-puck {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.user-cone-wrap {
  position: absolute;
  width: 96px;
  height: 96px;
  top: -24px;
  left: -24px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: transform 0.25s cubic-bezier(0.2, 0, 0.2, 1);
  transform-origin: 50% 50%;
}
.user-cone-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.user-halo {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.28);
  animation: trekkin-pulse 2s infinite ease-out;
  pointer-events: none;
}
.user-dot {
  position: relative;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #2563EB;
  border: 2.5px solid #FFFFFF;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
@keyframes trekkin-pulse {
  0% { transform: scale(1); opacity: 0.85; }
  70% { transform: scale(2.4); opacity: 0; }
  100% { transform: scale(2.4); opacity: 0; }
}
`;

function loadMapLibre(): Promise<any> {
  const g = globalThis as any;
  if (g.maplibregl) return Promise.resolve(g.maplibregl);
  if (g.__trekkinMapLibrePromise) return g.__trekkinMapLibrePromise;
  g.__trekkinMapLibrePromise = new Promise((resolve, reject) => {
    const doc = g.document;
    if (!doc?.head) {
      reject(new Error("MapLibre requiere un navegador"));
      return;
    }
    if (!doc.getElementById("maplibre-gl-css")) {
      const link = doc.createElement("link");
      link.id = "maplibre-gl-css";
      link.rel = "stylesheet";
      link.href = MAPLIBRE_GL_CSS_URL;
      doc.head.appendChild(link);
    }
    if (!doc.getElementById("trekkin-popup-css")) {
      const style = doc.createElement("style");
      style.id = "trekkin-popup-css";
      style.textContent = CALLOUT_CSS;
      doc.head.appendChild(style);
    }
    if (!doc.getElementById("trekkin-puck-css")) {
      const style = doc.createElement("style");
      style.id = "trekkin-puck-css";
      style.textContent = PUCK_CSS;
      doc.head.appendChild(style);
    }
    const script = doc.createElement("script");
    script.src = MAPLIBRE_GL_JS_URL;
    script.async = true;
    script.onload = () => resolve(g.maplibregl);
    script.onerror = () => reject(new Error("No se pudo cargar MapLibre GL"));
    doc.head.appendChild(script);
  });
  return g.__trekkinMapLibrePromise;
}

function loadPmtiles(): Promise<any> {
  const g = globalThis as any;
  if (g.pmtiles) return Promise.resolve(g.pmtiles);
  if (g.__trekkinPmtilesPromise) return g.__trekkinPmtilesPromise;
  g.__trekkinPmtilesPromise = new Promise((resolve, reject) => {
    const doc = g.document;
    if (!doc?.head) {
      reject(new Error("PMTiles requiere un navegador"));
      return;
    }
    const script = doc.createElement("script");
    script.src = PMTILES_JS_URL;
    script.async = true;
    script.onload = () => resolve(g.pmtiles);
    script.onerror = () => reject(new Error("No se pudo cargar PMTiles"));
    doc.head.appendChild(script);
  });
  return g.__trekkinPmtilesPromise;
}

function packUrlOf(scene: TrekMapScene): string | null {
  if (scene.offlinePack?.kind !== "pmtiles") return null;
  return scene.offlinePack.protocolUrl;
}

const emptyLine = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "LineString" as const,
    coordinates: [] as [number, number][],
  },
};

function lineData(coords: [number, number][]) {
  if (coords.length < 2) return emptyLine;
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: coords },
  };
}

function markerData(scene: TrekMapScene) {
  const nonUser = scene.markers.filter((m) => m.kind !== "user");
  return {
    type: "FeatureCollection" as const,
    features: nonUser.map((m) => ({
      type: "Feature" as const,
      properties: {
        kind: m.kind,
        label: m.label ?? "",
        notes: m.notes ?? "",
        id: m.id,
      },
      geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
    })),
  };
}

function updateUserPuck(
  map: any,
  maplibregl: any,
  scene: TrekMapScene,
  puckRef: React.MutableRefObject<{ marker: any; coneWrap: any } | null>,
): void {
  const userLoc =
    scene.userLocation ?? scene.markers.find((m) => m.kind === "user") ?? null;
  if (
    !userLoc ||
    typeof userLoc.lat !== "number" ||
    typeof userLoc.lng !== "number"
  ) {
    if (puckRef.current?.marker) {
      puckRef.current.marker.remove();
      puckRef.current = null;
    }
    return;
  }
  if (!puckRef.current) {
    const container = document.createElement("div");
    container.className = "trekkin-user-puck";

    const coneWrap = document.createElement("div");
    coneWrap.className = "user-cone-wrap";
    coneWrap.style.display = "none";
    coneWrap.innerHTML = `<svg class="user-cone-svg" viewBox="0 0 96 96">
      <defs>
        <radialGradient id="puck-cone-grad-web" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#2563EB" stop-opacity="0.55"/>
          <stop offset="45%" stop-color="#3B82F6" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <path d="M 48 48 L 25 8.16 A 46 46 0 0 1 71 8.16 Z" fill="url(#puck-cone-grad-web)"/>
    </svg>`;
    container.appendChild(coneWrap);

    const halo = document.createElement("div");
    halo.className = "user-halo";
    container.appendChild(halo);

    const dot = document.createElement("div");
    dot.className = "user-dot";
    container.appendChild(dot);

    const marker = new maplibregl.Marker({
      element: container,
      anchor: "center",
    });
    puckRef.current = { marker, coneWrap };
  }

  const { marker, coneWrap } = puckRef.current;
  marker.setLngLat([userLoc.lng, userLoc.lat]);
  if (!marker._map) {
    marker.addTo(map);
  }
  if (coneWrap) {
    if (typeof userLoc.heading === "number" && !isNaN(userLoc.heading)) {
      coneWrap.style.display = "flex";
      coneWrap.style.transform = `rotate(${userLoc.heading}deg)`;
    } else {
      coneWrap.style.display = "none";
    }
  }
}

function ensureLayers(map: any): void {
  if (!map.getSource("trekkin-trail")) {
    map.addSource("trekkin-trail", { type: "geojson", data: emptyLine });
    map.addLayer({
      id: "trekkin-trail-line",
      type: "line",
      source: "trekkin-trail",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": AndeanTheme.colors.primaryLight, "line-width": 4 },
    });
  }
  if (!map.getSource("trekkin-track")) {
    map.addSource("trekkin-track", { type: "geojson", data: emptyLine });
    map.addLayer({
      id: "trekkin-track-line",
      type: "line",
      source: "trekkin-track",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": AndeanTheme.colors.trackOrange, "line-width": 4 },
    });
  }
  if (!map.getSource("trekkin-markers")) {
    map.addSource("trekkin-markers", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "trekkin-markers-circle",
      type: "circle",
      source: "trekkin-markers",
      paint: {
        "circle-radius": 10,
        "circle-color": [
          "match",
          ["get", "kind"],
          "start",
          AndeanTheme.colors.primary,
          "end",
          AndeanTheme.colors.amberLight,
          "user",
          AndeanTheme.colors.trackOrange,
          AndeanTheme.colors.amber,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": AndeanTheme.colors.white,
      },
    });
  }
}

function paintScene(
  map: any,
  scene: TrekMapScene,
  maplibregl?: any,
  puckRef?: React.MutableRefObject<{ marker: any; coneWrap: any } | null>,
): void {
  ensureLayers(map);
  map.getSource("trekkin-trail")?.setData(lineData(scene.trail));
  map.getSource("trekkin-track")?.setData(lineData(scene.track));
  map.getSource("trekkin-markers")?.setData(markerData(scene));
  if (maplibregl && puckRef) {
    updateUserPuck(map, maplibregl, scene, puckRef);
  }
  if (scene.interactive === false) {
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.touchZoomRotate.disable();
  } else {
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.touchZoomRotate.enable();
  }
  if (
    shouldFitBounds(scene.bounds, scene.followUser, map.__trekkinFirstFitDone)
  ) {
    map.fitBounds(scene.bounds!, { padding: 40, duration: 400, maxZoom: 15 });
    if (scene.followUser === false) {
      map.__trekkinFirstFitDone = true;
    }
  }
}

/**
 * MapLibre GL JS en el DOM — `pnpm start` → web → localhost.
 */
export const TrekMap: React.FC<TrekMapProps> = (props) => {
  const {
    height = 280,
    style,
    interactive = true,
    accessibilityLabel,
    children,
    onPress,
    onPressCoordinate,
    onMapReady,
    onMapError,
  } = props;

  const hostRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const maplibreRef = useRef<any>(null);
  const puckRef = useRef<{ marker: any; coneWrap: any } | null>(null);
  const scene = useMemo(() => buildTrekMapScene(props), [props]);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const pressRef = useRef({ onPress, onPressCoordinate, interactive });
  pressRef.current = { onPress, onPressCoordinate, interactive };
  const packUrlRef = useRef<string | null>(packUrlOf(scene));
  const switchingRef = useRef(false);

  const applySceneWithPack = (map: any, next: TrekMapScene): void => {
    const nextUrl = packUrlOf(next);
    if (nextUrl === packUrlRef.current) {
      paintScene(map, next, maplibreRef.current, puckRef);
      return;
    }
    if (switchingRef.current) return;
    switchingRef.current = true;
    map.once("style.load", () => {
      packUrlRef.current = nextUrl;
      switchingRef.current = false;
      paintScene(map, sceneRef.current, maplibreRef.current, puckRef);
      onMapReady?.(Boolean(nextUrl));
    });
    map.setStyle(nextUrl ? buildOfflineVectorStyle(nextUrl) : ONLINE_STYLE_URL);
  };

  useEffect(() => {
    let cancelled = false;
    const node = hostRef.current;
    if (!node) return;

    void (async () => {
      try {
        const maplibregl = await loadMapLibre();
        maplibreRef.current = maplibregl;
        try {
          const pmtilesLib = await loadPmtiles();
          const g = globalThis as any;
          if (pmtilesLib && !g.__trekkinPmtilesProtocol) {
            const protocol = new pmtilesLib.Protocol();
            maplibregl.addProtocol("pmtiles", protocol.tile);
            g.__trekkinPmtilesProtocol = true;
          }
        } catch {
          // Pack opcional: el mapa online y el GPX siguen pintando.
        }
        if (cancelled || !hostRef.current) return;
        const initialPack = packUrlOf(sceneRef.current);
        packUrlRef.current = initialPack;
        const map = new maplibregl.Map({
          container: hostRef.current,
          style: initialPack
            ? buildOfflineVectorStyle(initialPack)
            : ONLINE_STYLE_URL,
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: true,
        });
        mapRef.current = map;
        map.on("load", () => {
          if (cancelled) return;
          paintScene(map, sceneRef.current, maplibreRef.current, puckRef);
          onMapReady?.(Boolean(packUrlRef.current));
        });
        map.on("error", (event: { error?: unknown }) => {
          const cause = event?.error;
          onMapError?.(
            cause instanceof Error
              ? cause
              : new Error("No se pudo cargar el mapa offline."),
          );
        });
        let popup: any = null;
        map.on(
          "click",
          (e: {
            lngLat: { lat: number; lng: number };
            point: { x: number; y: number };
          }) => {
            const pad = 18;
            let hits: any[] = [];
            try {
              hits = map.queryRenderedFeatures(
                [
                  [e.point.x - pad, e.point.y - pad],
                  [e.point.x + pad, e.point.y + pad],
                ],
                { layers: ["trekkin-markers-circle"] },
              );
            } catch {
              hits = [];
            }
            if (hits.length) {
              const feature = hits[0];
              const geom = feature.geometry as {
                type?: string;
                coordinates?: [number, number];
              };
              if (geom.type !== "Point" || !geom.coordinates) return;
              const props = feature.properties ?? {};
              popup?.remove?.();
              popup = new maplibregl.Popup({
                closeButton: true,
                closeOnClick: true,
                offset: 14,
                className: "trekkin-popup",
                maxWidth: "240px",
              })
                .setLngLat(geom.coordinates)
                .setHTML(buildCalloutHtml(props.kind, props.label, props.notes))
                .addTo(map);
              return;
            }
            const current = pressRef.current;
            if (!current.interactive) return;
            const point = { lat: e.lngLat.lat, lng: e.lngLat.lng };
            current.onPress?.(point);
            current.onPressCoordinate?.(point);
          },
        );
      } catch (error) {
        onMapError?.(
          error instanceof Error
            ? error
            : new Error("No se pudo inicializar el mapa offline."),
        );
      }
    })();

    return () => {
      cancelled = true;
      puckRef.current?.marker?.remove?.();
      puckRef.current = null;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
    // El mapa se crea una vez; las actualizaciones van por el efecto de scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded?.()) return;
    applySceneWithPack(map, scene);
  }, [scene]);

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { height },
    style,
  ];

  return (
    <View
      style={containerStyle}
      accessibilityLabel={accessibilityLabel || "Mapa interactivo de la ruta"}
    >
      {createElement("div", {
        ref: hostRef,
        style: {
          width: "100%",
          height: "100%",
          background: AndeanTheme.colors.backgroundSecondary,
        },
      })}
      {children}
    </View>
  );
};

export default TrekMap;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: AndeanTheme.borderRadius.lg,
    overflow: "hidden",
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    position: "relative",
  },
});
