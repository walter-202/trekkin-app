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

/**
 * HU-06 — Historial de actividades del usuario.
 * Fusiona las actividades sincronizadas (Firestore) con las pendientes de
 * sincronización guardadas localmente.
 */
interface HistoryViewProps {
  onSelect: (id: string) => void;
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onSelect,
  onBack,
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
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>MIS ACTIVIDADES</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AndeanTheme.colors.primary} />
        </View>
      ) : error && activities.length === 0 ? (
        <View style={styles.center}>
          <CloudOff size={24} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.center}>
          <History size={26} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.muted}>
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
                      <CloudOff size={11} color={AndeanTheme.colors.accentWarning} />
                      <Text style={styles.unsyncedText}>Sin sincronizar</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color={AndeanTheme.colors.textMuted} />
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
        >
          <ArrowUp size={14} color={AndeanTheme.colors.textSecondary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  headerTitle: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: 16,
    padding: 14,
  },
  cardBody: { flex: 1, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeTitle: { flex: 1, color: AndeanTheme.colors.text, fontSize: 13, fontWeight: "800" },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCompleted: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.4)",
  },
  badgeIncomplete: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: AndeanTheme.colors.borderLight,
  },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  badgeTextCompleted: { color: AndeanTheme.colors.accentWarning },
  badgeTextIncomplete: { color: AndeanTheme.colors.textSecondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
  metaDot: { color: AndeanTheme.colors.borderLight, fontSize: 11 },
  unsyncedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  unsyncedText: { color: AndeanTheme.colors.accentWarning, fontSize: 10, fontWeight: "700" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12, textAlign: "center" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
  },
  backText: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  pressed: { opacity: 0.8 },
});
