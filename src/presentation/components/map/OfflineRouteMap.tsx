import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import type { OfflineRoute } from "../../../core/domain/offline";
import { AndeanTheme } from "../../theme";

const VIEW_W = 360;
const VIEW_H = 200;
const PAD = 16;

export interface ProjectedPoint {
  x: number;
  y: number;
}

const projectPoint = (
  lat: number,
  lng: number,
  bounds: OfflineRoute["map"]["bounds"],
): ProjectedPoint => {
  const w = VIEW_W - PAD * 2;
  const h = VIEW_H - PAD * 2;
  const x = PAD + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * w;
  const y = PAD + h - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * h;
  return { x, y };
};

/**
 * HU-04 fallback — retícula SVG sin teselas de fondo (no es mapa base offline).
 * Se usa solo cuando el renderer vectorial PMTiles no está disponible.
 * Render del mapa descargado a partir de la geometría almacenada en el
 * dispositivo: fondo topográfico + retícula + trazado + puntos inicio/fin
 * + puntos relevantes. Sin red, sin tiles nativos: válido en Expo Go.
 */
interface OfflineRouteMapProps {
  route: OfflineRoute;
  height?: number;
  accessibilityLabel?: string;
}

export const OfflineRouteMap: React.FC<OfflineRouteMapProps> = ({
  route,
  height = 240,
  accessibilityLabel,
}) => {
  const geometry = useMemo(() => {
    const bounds = route.map.bounds;
    const gridCols = 5;
    const gridRows = 4;
    const vertical = Array.from({ length: gridCols + 1 }, (_, i) => {
      const x = (i / gridCols) * VIEW_W;
      return { x1: x, y1: 0, x2: x, y2: VIEW_H };
    });
    const horizontal = Array.from({ length: gridRows + 1 }, (_, i) => {
      const y = (i / gridRows) * VIEW_H;
      return { x1: 0, y1: y, x2: VIEW_W, y2: y };
    });
    const trailPoints = route.trail
      .map((p) => projectPoint(p.lat, p.lng, bounds))
      .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");
    const start = projectPoint(route.startPoint.lat, route.startPoint.lng, bounds);
    const end = projectPoint(route.endPoint.lat, route.endPoint.lng, bounds);
    const checkpoints: ProjectedPoint[] = route.checkpoints.map((cp) =>
      projectPoint(cp.lat, cp.lng, bounds),
    );
    return { vertical, horizontal, trailPoints, start, end, checkpoints };
  }, [route]);

  return (
    <View
      style={[styles.wrap, { height }]}
      accessibilityLabel={accessibilityLabel ?? `Mapa offline de ${route.title}`}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Rect width={VIEW_W} height={VIEW_H} fill={AndeanTheme.colors.backgroundSecondary} />
        {geometry.vertical.map((l, i) => (
          <Line
            key={`v${i}`}
            {...l}
            stroke={AndeanTheme.colors.primary}
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}
        {geometry.horizontal.map((l, i) => (
          <Line
            key={`h${i}`}
            {...l}
            stroke={AndeanTheme.colors.primary}
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}
        {geometry.trailPoints && (
          <Polyline
            points={geometry.trailPoints}
            fill="none"
            stroke={AndeanTheme.colors.primaryLight}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {geometry.checkpoints.map((cp, i) => (
          <Circle
            key={`cp${i}`}
            cx={cp.x}
            cy={cp.y}
            r={4}
            fill={AndeanTheme.colors.primary}
            stroke={AndeanTheme.colors.cardElevated}
            strokeWidth={1.5}
          />
        ))}
        <Circle
          cx={geometry.start.x}
          cy={geometry.start.y}
          r={6}
          fill={AndeanTheme.colors.primaryLight}
          stroke={AndeanTheme.colors.background}
          strokeWidth={2}
        />
        <Circle
          cx={geometry.end.x}
          cy={geometry.end.y}
          r={6}
          fill={AndeanTheme.colors.amberLight}
          stroke={AndeanTheme.colors.background}
          strokeWidth={2}
        />
        <SvgText
          x={PAD}
          y={VIEW_H - PAD - 2}
          fill={AndeanTheme.colors.textSecondary}
          fontSize={9}
          fontWeight="700"
        >
          {route.startPoint.name}
        </SvgText>
        <SvgText
          x={VIEW_W - PAD}
          y={PAD + 10}
          fill={AndeanTheme.colors.textSecondary}
          fontSize={9}
          fontWeight="700"
          textAnchor="end"
        >
          {route.endPoint.name}
        </SvgText>
      </Svg>
      <Text style={styles.caption}>
        {route.trail.length} pts de trazado · {route.checkpoints.length} pts relevantes · sin conexión
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: AndeanTheme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
  },
  caption: {
    position: "absolute",
    bottom: 4,
    right: 8,
    color: AndeanTheme.colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
  },
});
