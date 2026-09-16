import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { MapPin, Flag, CircleDot, X, Undo2, Trash2 } from 'lucide-react-native';
import { PlanMap } from '../map/PlanMap';
import type { PlannedPoint } from '../../../core/domain/plan';

/**
 * HU-07 — Selector de puntos sobre el mapa (se usa en crear y editar).
 * Permite alternar entre "punto inicial", "destino" y "puntos intermedios".
 * Sin dependencias de dominio/infraestructura: solo recibe y notifica puntos.
 */
interface PlanPointPickerProps {
  start: PlannedPoint | null;
  end: PlannedPoint | null;
  onStartChange: (point: PlannedPoint) => void;
  onEndChange: (point: PlannedPoint) => void;
  height?: number;
  /** Waypoints intermedios para gestión (C7). */
  waypoints?: PlannedPoint[];
  /** Callback al agregar un waypoint intermedio. */
  onAddWaypoint?: (lat: number, lng: number) => void;
  /** Callback al eliminar un waypoint por índice. */
  onRemoveWaypoint?: (index: number) => void;
  /** Callback al arrastrar un waypoint. */
  onWaypointDrag?: (index: number, lat: number, lng: number) => void;
  /** Callback para deshacer. */
  onUndo?: () => void;
  /** Callback para borrar todos los waypoints. */
  onClearWaypoints?: () => void;
  /** Si hay acciones de undo disponibles. */
  canUndo?: boolean;
}

export const PlanPointPicker: React.FC<PlanPointPickerProps> = ({
  start,
  end,
  onStartChange,
  onEndChange,
  height = 320,
  waypoints = [],
  onAddWaypoint,
  onRemoveWaypoint,
  onWaypointDrag,
  onUndo,
  onClearWaypoints,
  canUndo = false,
}) => {
  const [mode, setMode] = useState<'start' | 'end' | 'waypoints'>('start');

  const handlePress = (coords: { lat: number; lng: number }) => {
    if (mode === 'waypoints') {
      onAddWaypoint?.(coords.lat, coords.lng);
    } else {
      const point: PlannedPoint = { lat: coords.lat, lng: coords.lng };
      if (mode === 'start') onStartChange(point);
      else onEndChange(point);
    }
  };

  return (
    <View>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setMode('start')}
          style={[styles.tab, mode === 'start' && styles.tabActive]}
        >
          <MapPin size={14} color={mode === 'start' ? '#10B981' : '#9CA3AF'} />
          <Text style={[styles.tabText, mode === 'start' && styles.tabTextActive]}>
            INICIO
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('end')}
          style={[styles.tab, mode === 'end' && styles.tabActive]}
        >
          <Flag size={14} color={mode === 'end' ? '#F59E0B' : '#9CA3AF'} />
          <Text style={[styles.tabText, mode === 'end' && styles.tabTextActive]}>FIN</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('waypoints')}
          style={[styles.tab, mode === 'waypoints' && styles.tabActive]}
        >
          <CircleDot size={14} color={mode === 'waypoints' ? '#8B5CF6' : '#9CA3AF'} />
          <Text style={[styles.tabText, mode === 'waypoints' && styles.tabTextActive]}>
            PTS ({waypoints.length})
          </Text>
        </Pressable>
      </View>

      <PlanMap
        start={start}
        end={end}
        onPressCoordinate={handlePress}
        height={height}
        waypoints={waypoints}
        onWaypointDrag={onWaypointDrag}
        canUndo={canUndo}
        onUndo={onUndo}
        hasWaypoints={waypoints.length > 0}
        onClearWaypoints={onClearWaypoints}
      />

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <MapPin size={14} color="#10B981" />
          <Text style={styles.statusLabel}>Inicio</Text>
          <Text style={styles.statusValue}>
            {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : 'Toca el mapa'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Flag size={14} color="#F59E0B" />
          <Text style={styles.statusLabel}>Destino</Text>
          <Text style={styles.statusValue}>
            {end ? `${end.lng.toFixed(5)}, ${end.lng.toFixed(5)}` : 'Toca el mapa'}
          </Text>
        </View>
      </View>

      {mode === 'waypoints' && (
        <View style={styles.waypointsSection}>
          <View style={styles.waypointsHeader}>
            <Text style={styles.waypointsLabel}>
              PUNTOS INTERMEDIOS ({waypoints.length})
            </Text>
            <View style={styles.waypointsActions}>
              {canUndo && onUndo && (
                <Pressable onPress={onUndo} style={styles.actionBtn}>
                  <Undo2 size={14} color="#9CA3AF" />
                </Pressable>
              )}
              {waypoints.length > 0 && onClearWaypoints && (
                <Pressable onPress={onClearWaypoints} style={styles.actionBtn}>
                  <Trash2 size={14} color="#FCA5A5" />
                </Pressable>
              )}
            </View>
          </View>
          {waypoints.length === 0 ? (
            <Text style={styles.waypointsEmpty}>
              Toca el mapa para agregar puntos intermedios
            </Text>
          ) : (
            <ScrollView style={styles.waypointsList} nestedScrollEnabled>
              {waypoints.map((wp, i) => (
                <View key={i} style={styles.waypointRow}>
                  <View style={[styles.waypointDot, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.waypointDotText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.waypointCoords}>
                    {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                  </Text>
                  {onRemoveWaypoint && (
                    <Pressable
                      onPress={() => onRemoveWaypoint(i)}
                      style={styles.waypointRemove}
                    >
                      <X size={14} color="#FCA5A5" />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 10,
    paddingVertical: 8,
  },
  tabActive: { borderColor: '#10B981', backgroundColor: '#0A241C' },
  tabText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, color: '#9CA3AF' },
  tabTextActive: { color: '#F9FAFB' },
  statusCard: {
    marginTop: 10,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 11, color: '#D1D5DB', fontWeight: '700', flex: 1.2 },
  statusValue: { fontSize: 11, color: '#9CA3AF', flex: 2, textAlign: 'right' },
  waypointsSection: {
    marginTop: 10,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    padding: 12,
  },
  waypointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  waypointsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#8B5CF6',
  },
  waypointsActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0A241C',
    borderWidth: 1,
    borderColor: '#1A4537',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waypointsEmpty: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
  waypointsList: {
    maxHeight: 120,
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1A4537',
  },
  waypointDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waypointDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  waypointCoords: {
    flex: 1,
    fontSize: 11,
    color: '#D1D5DB',
    fontFamily: 'monospace',
  },
  waypointRemove: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#1A0A0A',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
});