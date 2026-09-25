import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Layers, Moon, Sun, Satellite, Check, Wifi } from "lucide-react-native";
import type { OnlineMapTheme } from "../../../infrastructure/map/mapStyle";
import { AndeanTheme } from "../../theme";

const OPTIONS: Array<{
  value: OnlineMapTheme;
  label: string;
  Icon: typeof Moon;
}> = [
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "satellite", label: "Satélite", Icon: Satellite },
];

interface MapThemeSelectorProps {
  value: OnlineMapTheme;
  onChange: (theme: OnlineMapTheme) => void;
  /**
   * True cuando el mapa sirve el pack offline (PMTiles) activo. Lo reporta
   * el propio TrekMap vía `onMapReady(offlinePackReady)`; default false
   * (sirviendo por red). El badge solo depende de esto, no del tema.
   */
  offlinePackActive?: boolean;
}

/**
 * Selector flotante de estilo de mapa (oscuro/claro/satélite).
 * Controlado: el estado vive en la vista (useState) y entra por props.
 * Se renderiza como hijo de `<TrekMap />` (overlay absoluto), por eso
 * funciona igual en web y en WebView nativo sin tocar TrekMap, mapStyle
 * ni el bridge. No altera el pack offline ni el trail/marcadores.
 */
export const MapThemeSelector: React.FC<MapThemeSelectorProps> = ({
  value,
  onChange,
  offlinePackActive = false,
}) => {
  const [open, setOpen] = useState(false);
  // Badge "online" si se sirve por red (los 3 temas son online); con pack
  // activo no hay badge, sin importar el tema seleccionado.
  const online = !offlinePackActive;

  const pick = (theme: OnlineMapTheme) => {
    onChange(theme);
    setOpen(false);
  };

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={
            online
              ? "Selector de mapa - Mapa online activo, requiere conexión a internet"
              : "Cambiar estilo del mapa"
          }
          accessibilityState={{ expanded: open }}
          hitSlop={6}
        >
          <Layers size={17} color={AndeanTheme.colors.text} />
        </Pressable>
        {online ? (
          <View
            style={styles.onlineBadge}
            pointerEvents="none"
            accessibilityLabel="Mapa online activo"
          >
            <Wifi size={9} color={AndeanTheme.colors.white} />
          </View>
        ) : null}
      </View>

      {open ? (
        <View style={styles.menu} accessibilityLabel="Estilos de mapa">
          {OPTIONS.map(({ value: theme, label, Icon }) => {
            const active = theme === value;
            return (
              <Pressable
                key={theme}
                onPress={() => pick(theme)}
                style={({ pressed }) => [
                  styles.option,
                  active && styles.optionActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mapa ${label.toLowerCase()}`}
                accessibilityState={{ selected: active }}
              >
                <Icon
                  size={15}
                  color={
                    active
                      ? AndeanTheme.colors.primaryDark
                      : AndeanTheme.colors.inkSecondary
                  }
                />
                <Text
                  style={[styles.optionText, active && styles.optionTextActive]}
                >
                  {label}
                </Text>
                {active ? (
                  <Check size={14} color={AndeanTheme.colors.primaryDark} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fabWrap: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AndeanTheme.colors.overlay,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  pressed: { opacity: 0.75 },
  // Badge ~35% del botón, a caballo del borde inferior derecho. Sin
  // interacción propia: el click lo recibe el botón completo.
  onlineBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AndeanTheme.colors.primaryDark,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  menu: {
    position: "absolute",
    top: 56,
    right: 10,
    minWidth: 148,
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: AndeanTheme.colors.successBg,
  },
  optionText: {
    flex: 1,
    color: AndeanTheme.colors.inkSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  optionTextActive: {
    color: AndeanTheme.colors.primaryDark,
    fontWeight: "800",
  },
});
