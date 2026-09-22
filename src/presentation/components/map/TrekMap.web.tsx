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
} from "../../../infrastructure/map/mapStyle";
import type { TrekMapScene } from "../../../infrastructure/map/mapBridge";
import { buildCalloutHtml, CALLOUT_CSS } from "./markerCallout";

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
    const script = doc.createElement("script");
    script.src = MAPLIBRE_GL_JS_URL;
    script.async = true;
    script.onload = () => resolve(g.maplibregl);
    script.onerror = () => reject(new Error("No se pudo cargar MapLibre GL"));
    doc.head.appendChild(script);
  });
  return g.__trekkinMapLibrePromise;
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
  return {
    type: "FeatureCollection" as const,
    features: scene.markers.map((m) => ({
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
      paint: { "line-color": "#3B82F6", "line-width": 4 },
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
          "#3B82F6",
          AndeanTheme.colors.amber,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": AndeanTheme.colors.white,
      },
    });
  }
}

function applyScene(map: any, scene: TrekMapScene): void {
  ensureLayers(map);
  map.getSource("trekkin-trail")?.setData(lineData(scene.trail));
  map.getSource("trekkin-track")?.setData(lineData(scene.track));
  map.getSource("trekkin-markers")?.setData(markerData(scene));
  if (scene.interactive === false) {
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.touchZoomRotate.disable();
  } else {
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.touchZoomRotate.enable();
  }
  // Fase 1 cámara libre: fitBounds solo en el primer apply útil (con bounds)
  // de esta instancia, y solo si followUser !== false. Sin bounds no se marca.
  if (scene.bounds && scene.followUser !== false) {
    map.fitBounds(scene.bounds, { padding: 40, duration: 400, maxZoom: 15 });
  } else if (scene.bounds && !map.__trekkinFirstFitDone) {
    map.fitBounds(scene.bounds, { padding: 40, duration: 400, maxZoom: 15 });
    map.__trekkinFirstFitDone = true;
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
  } = props;

  const hostRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const scene = useMemo(() => buildTrekMapScene(props), [props]);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const pressRef = useRef({ onPress, onPressCoordinate, interactive });
  pressRef.current = { onPress, onPressCoordinate, interactive };

  useEffect(() => {
    let cancelled = false;
    const node = hostRef.current;
    if (!node) return;

    void (async () => {
      try {
        const maplibregl = await loadMapLibre();
        if (cancelled || !hostRef.current) return;
        const map = new maplibregl.Map({
          container: hostRef.current,
          style: scene.styleUrl,
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: true,
        });
        mapRef.current = map;
        map.on("load", () => {
          if (cancelled) return;
          applyScene(map, sceneRef.current);
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
      } catch {
        // El contenedor se queda con el fondo andino si el CDN no carga.
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
    // El mapa se crea una vez; las actualizaciones van por el efecto de scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded?.()) return;
    applyScene(map, scene);
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
