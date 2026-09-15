import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Minus, Plus } from 'lucide-react-native';
import type { PlannedPoint } from '../../../core/domain/plan';
import {
  tileCache,
  ensureTilesReady,
  fetchTileAsDataUri,
} from '../../../infrastructure/persistence/tileCache';
import { ensureMapOfflineCache } from '../../../infrastructure/map/offlineMaps';
import {
  TILE_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  clamp,
  latLngToWorldPoint,
  worldPointToLatLng,
  zoomForBounds,
  zoomForRegion,
} from './mercator';
import { AndeanTheme } from '../../theme';
import LOCAL_TILES from '../../../assets/tileRegistry';

/** Punto genérico del trazado (waypoints de HU-03, futuro track GPS de HU-08). */
export interface TrailPoint {
  lat: number;
  lng: number;
}

/** Punto relevante genérico (checkpoints de HU-03). */
export interface PointOfInterest {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  notes?: string;
}

/** Sustituye al `Region` de react-native-maps (mismo contrato). */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Mapa compartido — HU-07 + HU-03.
 *
 * Renderiza teselas de OpenStreetMap con primitivas nativas de React Native
 * (View/Image/PanResponder + react-native-svg para el trazado): NO usa
 * WebView, iframes, Leaflet ni ninguna dependencia web. Funciona en nativo y
 * en web (Metro), y sobrevive sin internet: las teselas se cachean en
 * AsyncStorage (tileCache.ts) y, si fallan, la capa de puntos/trazado sigue
 * operativa sobre un lienzo neutro. Cumple la política de uso de OSM tiles.
 *
 * HU-07: selector de puntos (tap reporta coordenadas vía onPressCoordinate).
 * HU-03: visualización de trazado completo (`trail` → Polyline,
 * `pointsOfInterest` → marcadores).
 */
interface PlanMapProps {
  start?: PlannedPoint | null;
  end?: PlannedPoint | null;
  currentLocation?: PlannedPoint | null;
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  initialRegion?: MapRegion;
  height?: number;
  trail?: TrailPoint[];
  pointsOfInterest?: PointOfInterest[];
  accessibilityLabel?: string;
  routeWaypoints?: TrailPoint[];
  checkpoints?: PointOfInterest[] | Array<{ id: string; lat: number; lng: number; name?: string; notes?: string }>;
  track?: TrailPoint[];
  fitTo?: Array<{ lat: number; lng: number }>;
}

interface ViewState {
  lat: number;
  lng: number;
  zoom: number;
}

interface Viewport {
  w: number;
  h: number;
}

interface TileCell {
  z: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
}

const DEFAULT_VIEW: ViewState = { lat: -16.499, lng: -68.146, zoom: 9 };
const TAP_RADIUS = 12;
// Teselas de OpenStreetMap: gratuitas, sin API key, con cumplimiento estricto
// de la política de uso (User-Agent propio, ≤5/s, caché, sin reintentar 403).
// https://operations.osmfoundation.org/policies/tiles/
const TILE_URL = (z: number, x: number, y: number): string =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const tileKeyStr = (z: number, x: number, y: number): string => `${z}/${x}/${y}`;

const COLOR_START = '#10B981';
const COLOR_END = '#F59E0B';
const COLOR_CURRENT = '#3B82F6';
const COLOR_TRAIL = '#10B981';

function resolveInitialView(p: PlanMapProps): ViewState {
  if (p.initialRegion) {
    return {
      lat: p.initialRegion.latitude,
      lng: p.initialRegion.longitude,
      zoom: clamp(
        Math.round(zoomForRegion(p.initialRegion)),
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    };
  }
  const pts: Array<{ lat: number; lng: number }> = [
    ...(p.fitTo ?? []),
    ...(p.trail ?? []),
    ...(p.routeWaypoints ?? []),
    ...(p.track ?? []),
    ...(p.pointsOfInterest ?? []),
    ...(p.currentLocation ? [p.currentLocation] : []),
    ...(p.start ? [p.start] : []),
    ...(p.end ? [p.end] : []),
  ];
  if (pts.length === 0) return DEFAULT_VIEW;
  const lats = pts.map((q) => q.lat);
  const lngs = pts.map((q) => q.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const zoom = clamp(
    Math.round(
      zoomForBounds(maxLat - minLat, maxLng - minLng, (minLat + maxLat) / 2, 340, 260),
    ),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2, zoom };
}

const distance = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(bx - ax, by - ay);

export const PlanMap: React.FC<PlanMapProps> = (props) => {
  const {
    start,
    end,
    currentLocation,
    onPressCoordinate,
    height = 300,
    trail,
    pointsOfInterest,
    accessibilityLabel,
    routeWaypoints,
    checkpoints,
    track,
  } = props;

  const activeTrail = trail ?? routeWaypoints;
  const activePOIs: PointOfInterest[] =
    pointsOfInterest ??
    (checkpoints
      ? (checkpoints as any[]).map((c) => ({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          name: c.name,
          notes: c.notes,
        }))
      : []);

  const [viewport, setViewport] = useState<Viewport>({ w: 0, h: 0 });
  const [view, setView] = useState<ViewState>(() => resolveInitialView(props));
  const [uris, setUris] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const viewRef = useRef<ViewState>(view);
  const viewportRef = useRef<Viewport>(viewport);
  const originRef = useRef({ x: 0, y: 0 });
  const pressRef = useRef(onPressCoordinate);
  const wrapRef = useRef<View | null>(null);
  const urisRef = useRef<Record<string, string>>({});
  const inFlight = useRef<Set<string>>(new Set());
  const attemptsRef = useRef<Record<string, number>>({});
  const gesture = useRef({
    mode: 'idle' as 'idle' | 'pan' | 'pinch',
    lastDx: 0,
    lastDy: 0,
    pinchDist: 0,
    baseZoom: DEFAULT_VIEW.zoom,
    baseLat: 0,
    baseLng: 0,
  }).current;

  pressRef.current = onPressCoordinate;

  useEffect(() => {
    void ensureMapOfflineCache();
    void ensureTilesReady();
  }, []);

  const updateView = (next: ViewState): void => {
    viewRef.current = next;
    setView(next);
  };

  const zoomBy = (delta: number): void => {
    const v = viewRef.current;
    updateView({
      lat: v.lat,
      lng: v.lng,
      zoom: clamp(v.zoom + delta, MIN_ZOOM, MAX_ZOOM),
    });
  };

  const panBy = (dx: number, dy: number): void => {
    const v = viewRef.current;
    if (!viewportRef.current.w || !viewportRef.current.h) return;
    const world = latLngToWorldPoint(v.lat, v.lng, v.zoom);
    const ll = worldPointToLatLng(world.x + dx, world.y + dy, v.zoom);
    updateView({ lat: ll.lat, lng: ll.lng, zoom: v.zoom });
  };

  const screenToLatLng = (px: number, py: number): { lat: number; lng: number } => {
    const v = viewRef.current;
    const world = latLngToWorldPoint(v.lat, v.lng, v.zoom);
    return worldPointToLatLng(
      world.x - viewportRef.current.w / 2 + px,
      world.y - viewportRef.current.h / 2 + py,
      v.zoom,
    );
  };

  const storeUri = (key: string, uri: string): void => {
    if (urisRef.current[key]) return;
    urisRef.current[key] = uri;
    setUris({ ...urisRef.current });
  };

  const loadTile = async (z: number, x: number, y: number): Promise<void> => {
    const key = tileKeyStr(z, x, y);
    if (urisRef.current[key] || inFlight.current.has(key)) return;
    if (LOCAL_TILES[key]) return; // skip — asset local, no network needed
    if (tileCache.isDenied(z, x, y)) return;
    inFlight.current.add(key);
    try {
      await ensureTilesReady();
      if (tileCache.isDenied(z, x, y)) return;
      const cached = await tileCache.get(z, x, y);
      if (cached) {
        storeUri(key, cached);
        return;
      }
      const res = await fetchTileAsDataUri(TILE_URL(z, x, y));
      if (res.blocked) {
        void tileCache.markDenied(z, x, y);
        return;
      }
      if (res.dataUri) {
        void tileCache.put(z, x, y, res.dataUri);
        storeUri(key, res.dataUri);
        return;
      }
      // Fallo transitorio (sin red/timeout): reintentar para no dejar cuadros grises.
      const attempts = (attemptsRef.current[key] ?? 0) + 1;
      attemptsRef.current[key] = attempts;
      if (attempts <= 3) {
        setTimeout(() => {
          void loadTile(z, x, y);
        }, 5000);
      }
    } finally {
      inFlight.current.delete(key);
    }
  };

  const panResponder = useRef<PanResponderInstance | null>(null);
  if (panResponder.current === null) {
    const onGrant = (evt: { nativeEvent: { touches: { pageX: number; pageY: number }[] } }): void => {
      if (wrapRef.current && typeof wrapRef.current.measureInWindow === 'function') {
        wrapRef.current.measureInWindow((x, y) => {
          originRef.current = { x, y };
        });
      }
      const touches = evt.nativeEvent.touches;
      if (touches.length >= 2) {
        gesture.mode = 'pinch';
        gesture.pinchDist = distance(
          touches[0].pageX,
          touches[0].pageY,
          touches[1].pageX,
          touches[1].pageY,
        );
        const v = viewRef.current;
        gesture.baseZoom = v.zoom;
        gesture.baseLat = v.lat;
        gesture.baseLng = v.lng;
      } else {
        gesture.mode = 'pan';
        gesture.lastDx = 0;
        gesture.lastDy = 0;
      }
    };

    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: onGrant,
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          const a = touches[0];
          const b = touches[1];
          const d = distance(a.pageX, a.pageY, b.pageX, b.pageY);
          if (gesture.mode !== 'pinch') {
            gesture.mode = 'pinch';
            gesture.pinchDist = d;
            const v = viewRef.current;
            gesture.baseZoom = v.zoom;
            gesture.baseLat = v.lat;
            gesture.baseLng = v.lng;
            return;
          }
          if (gesture.pinchDist > 0) {
            const ratio = d / gesture.pinchDist;
            const nextZoom = clamp(
              Math.round(gesture.baseZoom + Math.log2(ratio)),
              MIN_ZOOM,
              MAX_ZOOM,
            );
            if (nextZoom !== viewRef.current.zoom) {
              updateView({
                lat: gesture.baseLat,
                lng: gesture.baseLng,
                zoom: nextZoom,
              });
            }
          }
        } else {
          if (gesture.mode === 'pinch') {
            gesture.mode = 'pan';
            gesture.lastDx = gs.dx;
            gesture.lastDy = gs.dy;
            return;
          }
          const dx = gs.dx - gesture.lastDx;
          const dy = gs.dy - gesture.lastDy;
          gesture.lastDx = gs.dx;
          gesture.lastDy = gs.dy;
          if (dx !== 0 || dy !== 0) panBy(dx, dy);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        const moved = Math.hypot(gs.dx, gs.dy);
        if (gesture.mode === 'pan' && moved <= TAP_RADIUS) {
          pressRef.current?.(
            screenToLatLng(
              gs.x0 - originRef.current.x,
              gs.y0 - originRef.current.y,
            ),
          );
        }
        gesture.mode = 'idle';
      },
      onPanResponderTerminate: () => {
        gesture.mode = 'idle';
      },
    });
  }

  const { tiles, topLeft } = useMemo(() => {
    if (!viewport.w || !viewport.h) return { tiles: [] as TileCell[], topLeft: { x: 0, y: 0 } };
    const world = latLngToWorldPoint(view.lat, view.lng, view.zoom);
    const tl = { x: world.x - viewport.w / 2, y: world.y - viewport.h / 2 };
    const maxIndex = Math.pow(2, view.zoom) - 1;
    const x0 = Math.floor(tl.x / TILE_SIZE);
    const y0 = Math.floor(tl.y / TILE_SIZE);
    const x1 = Math.floor((tl.x + viewport.w) / TILE_SIZE);
    const y1 = Math.floor((tl.y + viewport.h) / TILE_SIZE);
    const out: TileCell[] = [];
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || x > maxIndex) continue;
      for (let y = y0; y <= y1; y++) {
        if (y < 0 || y > maxIndex) continue;
        out.push({
          z: view.zoom,
          x,
          y,
          sx: x * TILE_SIZE - tl.x,
          sy: y * TILE_SIZE - tl.y,
        });
      }
    }
    return { tiles: out, topLeft: tl };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, viewport]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    tiles.forEach((t) => {
      void loadTile(t.z, t.x, t.y);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles]);

  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height: h } = e.nativeEvent.layout;
    if (!width || !h) return;
    viewportRef.current = { w: width, h };
    setViewport({ w: width, h });
    if (wrapRef.current && typeof wrapRef.current.measureInWindow === 'function') {
      wrapRef.current.measureInWindow((x, y) => {
        originRef.current = { x, y };
      });
    }
  };

  const toScreen = (p: { lat: number; lng: number }): { x: number; y: number } => {
    const w = latLngToWorldPoint(p.lat, p.lng, view.zoom);
    return { x: w.x - topLeft.x, y: w.y - topLeft.y };
  };

  const linePoints = useMemo(() => {
    if (!activeTrail || activeTrail.length < 2) return '';
    return activeTrail
      .map((p) => {
        const s = toScreen(p);
        return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrail, view, viewport]);

  const trackPoints = useMemo(() => {
    if (!track || track.length < 2) return '';
    return track
      .map((p) => {
        const s = toScreen(p);
        return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, view, viewport]);

  const renderTile = (t: TileCell) => {
    const key = tileKeyStr(t.z, t.x, t.y);
    // 1) Asset local pre-bundled (La Paz zoom 9-12) — funciona 100% offline
    const localAsset = LOCAL_TILES[key];
    if (localAsset) {
      return (
        <View
          key={key}
          pointerEvents="none"
          style={[styles.tile, { left: t.sx, top: t.sy }]}
        >
          <Image
            source={localAsset}
            style={styles.tileImage}
            fadeDuration={0}
          />
        </View>
      );
    }
    // 2) Cacheado en memoria (AsyncStorage — data URI)
    // 3) Network (solo si no hay bloqueo OSM)
    const uriSource = uris[key] ?? (
      Platform.OS === 'web' && failed[key] ? null : TILE_URL(t.z, t.x, t.y)
    );
    return (
      <View
        key={key}
        pointerEvents="none"
        style={[styles.tile, { left: t.sx, top: t.sy }]}
      >
        {uriSource ? (
          <Image
            source={{ uri: uriSource }}
            style={styles.tileImage}
            onError={
              Platform.OS === 'web'
                ? () => {
                    setFailed((prev) => ({ ...prev, [key]: true }));
                    const attempts = (attemptsRef.current[key] ?? 0) + 1;
                    attemptsRef.current[key] = attempts;
                    if (attempts <= 3) {
                      setTimeout(() => {
                        setFailed((prev) => {
                          if (!prev[key]) return prev;
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        });
                      }, 5000);
                    }
                  }
                : undefined
            }
            fadeDuration={0}
          />
        ) : (
          <View style={styles.tilePlaceholder} />
        )}
      </View>
    );
  };

  const MarkerDot: React.FC<{
    p: { x: number; y: number };
    color: string;
    label?: string;
  }> = ({ p, color, label }) => (
    <View
      pointerEvents="none"
      style={[styles.markerWrap, { left: p.x - 9, top: p.y - 9 }]}
    >
      <View style={[styles.marker, { backgroundColor: color }]} />
      {label ? (
        <Text style={styles.markerLabel} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      ref={wrapRef}
      onLayout={onLayout}
      style={[styles.wrap, { height }]}
      accessibilityLabel={accessibilityLabel ?? 'Mapa de ruta'}
    >
      {viewport.w > 0 && viewport.h > 0 ? (
        <View
          style={styles.viewport}
          {...panResponder.current?.panHandlers}
        >
          {tiles.map(renderTile)}

          {linePoints || trackPoints ? (
            <Svg
              width={viewport.w}
              height={viewport.h}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              {linePoints ? (
                <Polyline
                  points={linePoints}
                  fill="none"
                  stroke={COLOR_TRAIL}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
              ) : null}
              {trackPoints ? (
                <Polyline
                  points={trackPoints}
                  fill="none"
                  stroke={COLOR_CURRENT}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              ) : null}
            </Svg>
          ) : null}

          {start ? (
            <MarkerDot
              p={toScreen(start)}
              color={COLOR_START}
              label={start.name ?? 'Inicio'}
            />
          ) : null}
          {end ? (
            <MarkerDot
              p={toScreen(end)}
              color={COLOR_END}
              label={end.name ?? 'Destino'}
            />
          ) : null}
          {currentLocation ? (
            <MarkerDot
              p={toScreen(currentLocation)}
              color={COLOR_CURRENT}
              label={currentLocation.name ?? 'Ubicación actual'}
            />
          ) : null}
          {activePOIs.map((poi) => (
            <MarkerDot
              key={poi.id}
              p={toScreen(poi)}
              color={COLOR_START}
              label={poi.name}
            />
          ))}
        </View>
      ) : null}

      {viewport.w > 0 && viewport.h > 0 ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.controls}>
            <Pressable
              onPress={() => zoomBy(1)}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
              accessibilityLabel="Acercar mapa"
            >
              <Plus size={16} color={AndeanTheme.colors.primaryLight} />
            </Pressable>
            <Pressable
              onPress={() => zoomBy(-1)}
              style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
              accessibilityLabel="Alejar mapa"
            >
              <Minus size={16} color={AndeanTheme.colors.primaryLight} />
            </Pressable>
          </View>
          <View pointerEvents="none" style={styles.attributionRow}>
            <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    backgroundColor: AndeanTheme.colors.card,
  },
  viewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tilePlaceholder: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: '#0A241C',
    borderColor: '#153E32',
    borderWidth: StyleSheet.hairlineWidth,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 6,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 35, 27, 0.92)',
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnPressed: {
    opacity: 0.6,
  },
  attributionRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 35, 27, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attribution: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 9,
  },
  markerWrap: {
    position: 'absolute',
    width: 18,
    alignItems: 'center',
  },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  markerLabel: {
    color: AndeanTheme.colors.text,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    backgroundColor: 'rgba(6, 35, 27, 0.85)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});