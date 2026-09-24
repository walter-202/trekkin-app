import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Navigation, CheckCircle2 } from 'lucide-react-native';
import { TrekMap } from '../../components/map/TrekMap';
import { Button } from '../../components/ui';
import { usePlanStore } from '../../../infrastructure/persistence/usePlanStore';
import type { PlannedPoint } from '../../../core/domain/plan';
import { AndeanTheme } from '../../theme';

/**
 * HU-07 T8/T9 — Confirmar o modificar el punto inicial real al llegar al lugar.
 * Usa expo-location para prellenar la ubicación actual y permite corregirla
 * con un tap en el mapa antes de confirmar.
 */
interface StartPointConfirmViewProps {
  onConfirmed: () => void;
}

export const StartPointConfirmView: React.FC<StartPointConfirmViewProps> = ({ onConfirmed }) => {
  const plan = usePlanStore((s) => s.plan);
  const { saving, confirmStart } = usePlanStore();

  const [current, setCurrent] = useState<PlannedPoint | null>(null);
  const [pending, setPending] = useState<PlannedPoint | null>(plan?.startPoint ?? null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLocating(true);
      setLocationError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (active) {
            setLocationError('Permiso de ubicación denegado. Puedes fijar el punto con un tap en el mapa.');
            setLocating(false);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        if (active) {
          const loc: PlannedPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Ubicación actual' };
          setCurrent(loc);
          // Si aún no hay punto fijado, se usa la ubicación actual como propuesta.
          setPending((prev) => prev ?? loc);
          setLocating(false);
        }
      } catch (err: any) {
        if (active) {
          setLocationError(err?.message ?? 'No se pudo obtener la ubicación. Usa el mapa.');
          setLocating(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const target = pending ?? current ?? plan?.startPoint;

  const handleConfirm = async () => {
    if (!target) return;
    const ok = await confirmStart(target);
    if (ok) onConfirmed();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.help}>
        Confirma el <Text style={styles.helpStrong}>punto inicial real</Text> de la ruta. Si ya
        estás en el lugar, usa la ubicación actual; si no, toca el mapa para corregirlo.
      </Text>

      {locationError && <Text style={styles.locationWarning}>{locationError}</Text>}

      {locating ? (
        <View style={[styles.mapPlaceholder, { height: 260 }]}>
          <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
          <Text style={styles.muted}>Obteniendo tu ubicación…</Text>
        </View>
      ) : (
        <TrekMap
          start={target}
          currentLocation={current}
          onPressCoordinate={(c) => setPending({ lat: c.lat, lng: c.lng, name: 'Inicio confirmado' })}
          height={260}
        />
      )}

      <View style={styles.infoCard}>
        <Navigation size={14} color={AndeanTheme.colors.fieldIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>PUNTO DE INICIO A CONFIRMAR</Text>
          {target ? (
            <Text style={styles.infoValue}>
              {target.name ?? 'Punto seleccionado'} · {target.lat.toFixed(5)}, {target.lng.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.infoValue}>Toca el mapa para elegir un punto.</Text>
          )}
        </View>
      </View>

      {current && !pending && (
        <Button
          title="USAR MI UBICACIÓN ACTUAL"
          variant="outline-green"
          onPress={() => setPending(current)}
          icon={<Navigation size={14} color={AndeanTheme.colors.primaryDark} />}
        />
      )}

      <Button
        title="CONFIRMAR PUNTO DE INICIO"
        onPress={handleConfirm}
        loading={saving}
        disabled={!target}
        icon={<CheckCircle2 size={15} color={AndeanTheme.colors.white} />}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  help: { color: AndeanTheme.colors.inkSecondary, fontSize: 12, lineHeight: 17 },
  helpStrong: { color: AndeanTheme.colors.ink, fontWeight: '800' },
  locationWarning: { color: AndeanTheme.colors.errorText, fontSize: 11 },
  mapPlaceholder: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    backgroundColor: AndeanTheme.colors.field,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  muted: { color: AndeanTheme.colors.fieldHint, fontSize: 12 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AndeanTheme.colors.field,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 12,
  },
  infoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: AndeanTheme.colors.fieldHint },
  infoValue: { color: AndeanTheme.colors.ink, fontSize: 12, marginTop: 2 },
});