import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ScreenShell } from "../../components/layout";
import { HistoryView } from "./HistoryView";
import { ActivityDetailView } from "./ActivityDetailView";
import { AndeanTheme } from "../../theme";

interface HistoryHubViewProps {
  onClose: () => void;
}

/**
 * HU-06 — Acceso directo al historial de actividades desde el menú lateral.
 * Lista + detalle sin pasar por el flujo de realizar una ruta.
 */
export const HistoryHubView: React.FC<HistoryHubViewProps> = ({ onClose }) => {
  const [detailId, setDetailId] = useState<string | null>(null);

  if (detailId) {
    return (
      <ActivityDetailView
        id={detailId}
        onBack={() => setDetailId(null)}
      />
    );
  }

  return (
    <ScreenShell
      body="none"
      header={
        <>
          <View style={styles.topBar}>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
            >
              <Text style={styles.link}>Inicio</Text>
            </Pressable>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>HISTORIAL</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Mis actividades</Text>
            <Text style={styles.session}>
              Recorridos realizados y pendientes de sincronizar.
            </Text>
          </View>
        </>
      }
    >
      <HistoryView
        showHeader={false}
        onSelect={(id) => setDetailId(id)}
        onBack={onClose}
      />
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  link: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AndeanTheme.colors.primaryLight,
  },
  badgeText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  titleBlock: { gap: 4, marginBottom: 4 },
  title: {
    color: AndeanTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  session: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
