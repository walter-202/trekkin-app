import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, Flag } from 'lucide-react-native';
import { TrekMap } from '../map/TrekMap';
import type { PlannedPoint } from '../../../core/domain/plan';
import { AndeanTheme } from '../../theme';

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
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');

  const handleCoordinate = (coord: { lat: number; lng: number }) => {
    if (activeTab === 'start') {
      onStartChange({ lat: coord.lat, lng: coord.lng, name: 'Punto inicial (provisional)' });
      setActiveTab('end');
    } else {
      onEndChange({ lat: coord.lat, lng: coord.lng, name: 'Destino (provisional)' });
    }
  };

  return (
    <View>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setActiveTab('start')}
          style={[styles.tab, activeTab === 'start' && styles.tabActive]}
        >
          <MapPin size={14} color={activeTab === 'start' ? AndeanTheme.colors.primary : AndeanTheme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'start' && styles.tabTextActive]}>
            1. PUNTO INICIAL
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('end')}
          style={[styles.tab, activeTab === 'end' && styles.tabActive]}
        >
          <Flag size={14} color={activeTab === 'end' ? AndeanTheme.colors.accentWarning : AndeanTheme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'end' && styles.tabTextActive]}>
            2. DESTINO
          </Text>
        </Pressable>
      </View>

      <TrekMap
        start={start}
        end={end}
        onPressCoordinate={handleCoordinate}
        height={height}
      />

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <MapPin size={14} color={AndeanTheme.colors.primary} />
          <Text style={styles.statusLabel}>Punto inicial (provisional)</Text>
          <Text style={styles.statusValue}>
            {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : 'Toca el mapa para fijarlo'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Flag size={14} color={AndeanTheme.colors.accentWarning} />
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
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
  },
  tabActive: { borderColor: AndeanTheme.colors.primary, backgroundColor: AndeanTheme.colors.cardElevated },
  tabText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: AndeanTheme.colors.textSecondary },
  tabTextActive: { color: AndeanTheme.colors.text },
  statusCard: {
    marginTop: 10,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 11, color: AndeanTheme.colors.text, fontWeight: '700', flex: 1.2 },
  statusValue: { fontSize: 11, color: AndeanTheme.colors.textSecondary, flex: 2, textAlign: 'right' },
});