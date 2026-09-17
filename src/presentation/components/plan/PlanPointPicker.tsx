import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, Flag } from 'lucide-react-native';
import { TrekMap } from '../map/TrekMap';
import type { PlannedPoint } from '../../../core/domain/plan';

/**
 * HU-07 — Selector de puntos sobre el mapa (se usa en crear y editar).
 * Permite alternar entre "punto inicial" y "destino" y hacer tap en el mapa.
 * Sin dependencias de dominio/infraestructura: solo recibe y notifica puntos.
 */
interface PlanPointPickerProps {
  start: PlannedPoint | null;
  end: PlannedPoint | null;
  onStartChange: (point: PlannedPoint) => void;
  onEndChange: (point: PlannedPoint) => void;
  height?: number;
}

export const PlanPointPicker: React.FC<PlanPointPickerProps> = ({
  start,
  end,
  onStartChange,
  onEndChange,
  height = 320,
}) => {
  const [mode, setMode] = useState<'start' | 'end'>('start');

  const handlePress = (coords: { lat: number; lng: number }) => {
    const point: PlannedPoint = { lat: coords.lat, lng: coords.lng };
    if (mode === 'start') onStartChange(point);
    else onEndChange(point);
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
            PUNTO INICIAL
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('end')}
          style={[styles.tab, mode === 'end' && styles.tabActive]}
        >
          <Flag size={14} color={mode === 'end' ? '#F59E0B' : '#9CA3AF'} />
          <Text style={[styles.tabText, mode === 'end' && styles.tabTextActive]}>DESTINO</Text>
        </Pressable>
      </View>

      <TrekMap
        start={start}
        end={end}
        onPressCoordinate={handlePress}
        height={height}
      />

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <MapPin size={14} color="#10B981" />
          <Text style={styles.statusLabel}>Inicio (provisional)</Text>
          <Text style={styles.statusValue}>
            {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : 'Toca el mapa para fijarlo'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Flag size={14} color="#F59E0B" />
          <Text style={styles.statusLabel}>Destino (provisional)</Text>
          <Text style={styles.statusValue}>
            {end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : 'Toca el mapa para fijarlo'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0E2E24',
    borderWidth: 1,
    borderColor: '#1A4537',
    borderRadius: 12,
    paddingVertical: 10,
  },
  tabActive: { borderColor: '#10B981', backgroundColor: '#0A241C' },
  tabText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#9CA3AF' },
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
});