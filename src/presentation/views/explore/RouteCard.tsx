import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { Mountain, Clock, Ruler } from "lucide-react-native";
import type { RouteModel } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

const difficultyLabel: Record<RouteModel["difficulty"], string> = {
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
  experto: "Experto",
};

/**
 * HU-03 C5 — Tarjeta resumen (nombre, distancia, dificultad, imagen si aplica).
 * Colocalizada en explore (un solo uso); sin lógica de negocio.
 */
export const RouteCard: React.FC<{
  route: RouteModel;
  onPress: () => void;
}> = ({ route, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${route.title}`}
    >
      <View style={styles.header}>
        <View style={styles.thumb}>
          {route.photos?.[0] ? (
            <Image
              source={{ uri: route.photos[0] }}
              style={styles.thumbImage}
              accessibilityLabel={`Foto de ${route.title}`}
            />
          ) : (
            <Mountain size={18} color={AndeanTheme.colors.primaryLight} />
          )}
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {route.title}
          </Text>
          <Text style={styles.region} numberOfLines={1}>
            {route.region ||
              `${route.startPoint.name} → ${route.endPoint.name}`}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {difficultyLabel[route.difficulty]}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ruler size={12} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metaText}>{route.distanceKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={12} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.metaText}>
            {Math.round(route.durationMinutes / 60)} h
          </Text>
        </View>
        <Text style={styles.routeLine} numberOfLines={1}>
          {route.startPoint.name} → {route.endPoint.name}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.lg,
    padding: AndeanTheme.spacing.md,
    gap: AndeanTheme.spacing.sm,
  },
  pressed: { opacity: 0.85 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: 40, height: 40, borderRadius: 12 },
  titleWrap: { flex: 1 },
  title: { color: AndeanTheme.colors.text, fontSize: 14, fontWeight: "800" },
  region: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
  badge: {
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 10,
    fontWeight: "800",
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  routeLine: {
    flex: 1,
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    textAlign: "right",
  },
});
