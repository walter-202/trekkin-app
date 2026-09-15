import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Compass, User as UserIcon, X } from "lucide-react-native";
import type { UserProfile } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

export type DrawerRoute = "inicio" | "perfil";

interface DrawerProps {
  open: boolean;
  active?: DrawerRoute;
  currentUser: UserProfile | null;
  onNavigate: (route: DrawerRoute) => void;
  onClose: () => void;
}

/**
 * HU-03 — Sidebar recortado (solo INICIO + PERFIL).
 * Overlay flotante: visible desde cualquier pantalla, con o sin sesión.
 * Apertura/cierre con slide-in clásico desde el borde izquierdo + fade del fondo.
 * No incluye login explícito (el login solo lo dispara el gate),
 * ni Descargas/Nueva Ruta/Capas/SOS (HUs de otros devs, fuera de alcance).
 * Reutiliza datos existentes del perfil (nombre, usuario), sin campos nuevos.
 */
const PANEL_WIDTH = 300;
const ANIM_MS = 250;

export const Drawer: React.FC<DrawerProps> = ({
  open,
  active,
  currentUser,
  onNavigate,
  onClose,
}) => {
  const [visible, setVisible] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: ANIM_MS,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANIM_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }
  }, [open, progress]);

  if (!visible) return null;

  const go = (route: DrawerRoute) => {
    onNavigate(route);
    onClose();
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-PANEL_WIDTH, 0],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.overlay} accessibilityLabel="Menú de navegación">
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <View style={styles.panelHeader}>
          <Text style={styles.brand}>TREKKIN APP</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            hitSlop={8}
          >
            <X size={18} color={AndeanTheme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.userBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(currentUser?.displayName ?? "V").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userTextWrap}>
            <Text style={styles.userName} numberOfLines={1}>
              {currentUser?.displayName ?? "Visitante"}
            </Text>
            <Text style={styles.userHandle} numberOfLines={1}>
              {currentUser
                ? `@${currentUser.username ?? currentUser.email.split("@")[0]}`
                : "Catálogo público"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => go("inicio")}
          style={[styles.item, active === "inicio" && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Ir al inicio, catálogo de rutas"
        >
          <Compass
            size={16}
            color={
              active === "inicio"
                ? AndeanTheme.colors.primaryLight
                : AndeanTheme.colors.textSecondary
            }
          />
          <View>
            <Text
              style={[
                styles.itemTitle,
                active === "inicio" && styles.itemTitleActive,
              ]}
            >
              INICIO
            </Text>
            <Text style={styles.itemSub}>Catálogo de rutas</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => go("perfil")}
          style={[styles.item, active === "perfil" && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Ir al perfil"
        >
          <UserIcon
            size={16}
            color={
              active === "perfil"
                ? AndeanTheme.colors.primaryLight
                : AndeanTheme.colors.textSecondary
            }
          />
          <View>
            <Text
              style={[
                styles.itemTitle,
                active === "perfil" && styles.itemTitleActive,
              ]}
            >
              PERFIL
            </Text>
            <Text style={styles.itemSub}>Mi cuenta y sesión</Text>
          </View>
        </Pressable>
      </Animated.View>
      <Animated.View
        style={[styles.backdropWrap, { opacity: backdropOpacity }]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    flexDirection: "row",
  },
  backdropWrap: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.overlay,
  },
  panel: {
    width: PANEL_WIDTH,
    maxWidth: "82%",
    backgroundColor: AndeanTheme.colors.background,
    borderRightWidth: 1,
    borderRightColor: AndeanTheme.colors.border,
    padding: AndeanTheme.spacing.lg,
    gap: AndeanTheme.spacing.sm,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: AndeanTheme.spacing.sm,
  },
  brand: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
  },
  userBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: AndeanTheme.colors.card,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.md,
    padding: AndeanTheme.spacing.sm,
    marginBottom: AndeanTheme.spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 16,
    fontWeight: "900",
  },
  userTextWrap: { flex: 1 },
  userName: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  userHandle: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    backgroundColor: AndeanTheme.colors.card,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  itemActive: {
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderColor: AndeanTheme.colors.primary,
  },
  itemTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  itemTitleActive: { color: AndeanTheme.colors.primaryLight },
  itemSub: { color: AndeanTheme.colors.textSecondary, fontSize: 11 },
});
