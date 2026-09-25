import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { History, ChevronRight, ArrowUp, CloudOff } from "lucide-react-native";
import { useAuth } from "../../../infrastructure/auth/AuthContext";
import { useActivityStore } from "../../../infrastructure/persistence/useActivityStore";
import { formatDuration, formatKm, formatDate } from "../../utils/format";
import { AndeanTheme } from "../../theme";
import { sheetStyles } from "../../components/layout";

/**
 * HU-06 — Historial de actividades del usuario.
 * Fusiona las actividades sincronizadas (Firestore) con las pendientes de
 * sincronización guardadas localmente.
 * Contenido sobre la hoja blanca del hub ActivityView (capas duales).
 */
interface HistoryViewProps {
  onSelect: (id: string) => void;
  onBack: () => void;
  /** Oculta el título de sección cuando el padre ya lo muestra (p. ej. HistoryHubView). */
  showHeader?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onSelect,
  onBack,
  showHeader = true,
}) => {
  const { currentUser } = useAuth();
  const activities = useActivityStore((s) => s.activities);
  const isLoading = useActivityStore((s) => s.isLoading);
  const error = useActivityStore((s) => s.error);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;
    useActivityStore.getState().listActivities(uid);
  }, [currentUser]);

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.headerRow}>
          <Text style={sheetStyles.sectionTitle}>Mis actividades</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.primaryDark} />
        </View>
      ) : error && activities.length === 0 ? (
        <View style={styles.center}>
          <CloudOff size={24} color={AndeanTheme.colors.fieldIcon} />
          <Text style={sheetStyles.muted}>{error}</Text>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.center}>
          <History size={26} color={AndeanTheme.colors.fieldIcon} />
          <Text style={sheetStyles.muted}>
            Aún no hay actividades en tu historial.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const completed = item.status === "completed";
            return (
              <Pressable
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Actividad ${item.routeTitle}`}
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.routeTitle} numberOfLines={1}>
                      {item.routeTitle}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        completed
                          ? styles.badgeCompleted
                          : styles.badgeIncomplete,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          completed
                            ? styles.badgeTextCompleted
                            : styles.badgeTextIncomplete,
                        ]}
                      >
                        {completed ? "COMPLETA" : "INCOMPLETA"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {formatKm(item.distanceCoveredKm)}
                    </Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>
                      {formatDuration(item.durationSeconds)}
                    </Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  {!item.isSynced && (
                    <View style={styles.unsyncedRow}>
                      <CloudOff size={11} color={AndeanTheme.colors.amber} />
                      <Text style={styles.unsyncedText}>Sin sincronizar</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color={AndeanTheme.colors.fieldIcon} />
              </Pressable>
            );
          }}
        />
      )}

      {activities.length > 0 && (
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowUp size={14} color={AndeanTheme.colors.inkSecondary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 4 },
  list: { paddingHorizontal: 24, gap: 10, paddingBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.sheet,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.fieldBorder,
    borderRadius: 16,
    padding: 14,
  },
  cardBody: { flex: 1, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeTitle: {
    flex: 1,
    color: AndeanTheme.colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCompleted: {
    backgroundColor: AndeanTheme.colors.successBg,
    borderColor: AndeanTheme.colors.successBorder,
  },
  badgeIncomplete: {
    backgroundColor: AndeanTheme.colors.field,
    borderColor: AndeanTheme.colors.fieldBorder,
  },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  badgeTextCompleted: { color: AndeanTheme.colors.successText },
  badgeTextIncomplete: { color: AndeanTheme.colors.inkSecondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: AndeanTheme.colors.inkSecondary, fontSize: 11 },
  metaDot: { color: AndeanTheme.colors.fieldBorder, fontSize: 11 },
  unsyncedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  unsyncedText: {
    color: AndeanTheme.colors.amber,
    fontSize: 10,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
  },
  backText: { color: AndeanTheme.colors.inkSecondary, fontSize: 12 },
  pressed: { opacity: 0.8 },
});
