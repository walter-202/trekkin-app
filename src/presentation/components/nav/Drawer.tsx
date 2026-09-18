import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import {
  Compass,
  MapPinned,
  User as UserIcon,
  ShieldCheck,
  LogIn,
  X,
  HardDrive,
  Activity,
  LocateFixed,
} from "lucide-react-native";
import type { UserProfile } from "../../../core/domain/types";
import { AndeanTheme } from "../../theme";

export type DrawerRoute =
  | "inicio"
  | "record"
  | "free-record"
  | "actividad"
  | "descargas"
  | "perfil"
  | "usuarios"
  | "login";

interface DrawerProps {
  open: boolean;
  active?: DrawerRoute;
  currentUser: UserProfile | null;
  isAdmin: boolean;
  onNavigate: (route: DrawerRoute) => void;
  onClose: () => void;
}

const PANEL_WIDTH = 300;
const ANIM_MS = 250;

export const Drawer: React.FC<DrawerProps> = ({
  open,
  active,
  currentUser,
  isAdmin,
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
    outputRange: [0, 0.6],
  });

  return (
    <View style={styles.overlay} accessibilityLabel="Menú de navegación">
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <View style={styles.panelHeader}>
          <Text style={styles.brand}>TREKKIN BOLIVIA</Text>
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

        {/* Card de usuario / visitante */}
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
                : "Catálogo libre"}
            </Text>
          </View>
          {currentUser?.role === "admin" ? (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          ) : null}
        </View>

        {/* 1. Explorar rutas (HU-03) */}
        <Pressable
          onPress={() => go("inicio")}
          style={[styles.item, active === "inicio" && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Ir al catálogo de rutas"
        >
          <Compass
            size={18}
            color={
              active === "inicio"
                ? AndeanTheme.colors.primaryLight
                : AndeanTheme.colors.textSecondary
            }
          />
          <View style={styles.itemTextWrap}>
            <Text
              style={[
                styles.itemTitle,
                active === "inicio" && styles.itemTitleActive,
              ]}
            >
              EXPLORAR RUTAS
            </Text>
            <Text style={styles.itemSub}>Catálogo público de montaña</Text>
          </View>
        </Pressable>

        {/* 2. Planificar nueva ruta (HU-07) */}
        <Pressable
          onPress={() => go("record")}
          style={[styles.item, active === "record" && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Planificar nueva ruta"
        >
          <MapPinned
            size={18}
            color={
              active === "record"
                ? AndeanTheme.colors.primaryLight
                : AndeanTheme.colors.textSecondary
            }
          />
          <View style={styles.itemTextWrap}>
            <Text
              style={[
                styles.itemTitle,
                active === "record" && styles.itemTitleActive,
              ]}
            >
              PLANIFICAR RUTA
            </Text>
            <Text style={styles.itemSub}>Trazado y puntos provisionales</Text>
          </View>
        </Pressable>

        {/* 2b. Grabar ruta libre (HU-08): desde la ubicación GPS actual */}
        <Pressable
          onPress={() => go("free-record")}
          style={[styles.item, active === "free-record" && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Grabar ruta desde mi ubicación"
        >
          <LocateFixed
            size={18}
            color={
              active === "free-record"
                ? AndeanTheme.colors.primaryLight
                : AndeanTheme.colors.textSecondary
            }
          />
          <View style={styles.itemTextWrap}>
            <Text
              style={[
                styles.itemTitle,
                active === "free-record" && styles.itemTitleActive,
              ]}
            >
              GRABAR RUTA
            </Text>
            <Text style={styles.itemSub}>Desde tu ubicación actual</Text>
          </View>
        </Pressable>

        {/* 3. Actividad GPS / Realizar ruta (HU-06 + HU-08) */}
        <Pressable
          onPress={() => go("actividad")}
          style={[styles.item, active === "actividad" && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Seguimiento GPS y realizar ruta"
        >
          <Activity
            size={18}
            color={
              active === "actividad"
                ? AndeanTheme.colors.primaryLight
                : AndeanTheme.colors.textSecondary
            }
          />
          <View style={styles.itemTextWrap}>
            <Text
              style={[
                styles.itemTitle,
                active === "actividad" && styles.itemTitleActive,
              ]}
            >
              ACTIVIDAD GPS
            </Text>
            <Text style={styles.itemSub}>Seguimiento y grabación en vivo</Text>
          </View>
        </Pressable>

        {/* 4. Rutas descargadas (HU-04) */}
        <Pressable
          onPress={() => go("descargas")}
          style={[styles.item, active === "descargas" && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Ver rutas descargadas offline"
        >
          <HardDrive
            size={18}
            color={
              active === "descargas"
                ? AndeanTheme.colors.primaryLight
                : AndeanTheme.colors.textSecondary
            }
          />
          <View style={styles.itemTextWrap}>
            <Text
              style={[
                styles.itemTitle,
                active === "descargas" && styles.itemTitleActive,
              ]}
            >
              DESCARGAS OFFLINE
            </Text>
            <Text style={styles.itemSub}>Rutas disponibles sin conexión</Text>
          </View>
        </Pressable>

        {/* 3. Perfil o Login */}
        {currentUser ? (
          <Pressable
            onPress={() => go("perfil")}
            style={[styles.item, active === "perfil" && styles.itemActive]}
            accessibilityRole="button"
            accessibilityLabel="Ir a mi perfil"
          >
            <UserIcon
              size={18}
              color={
                active === "perfil"
                  ? AndeanTheme.colors.primaryLight
                  : AndeanTheme.colors.textSecondary
              }
            />
            <View style={styles.itemTextWrap}>
              <Text
                style={[
                  styles.itemTitle,
                  active === "perfil" && styles.itemTitleActive,
                ]}
              >
                MI PERFIL
              </Text>
              <Text style={styles.itemSub}>Mis datos y sesión</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => go("login")}
            style={[styles.item, styles.itemHighlight]}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión o registrarse"
          >
            <LogIn size={18} color={AndeanTheme.colors.primaryLight} />
            <View style={styles.itemTextWrap}>
              <Text style={[styles.itemTitle, styles.itemTitleHighlight]}>
                INICIAR SESIÓN
              </Text>
              <Text style={styles.itemSub}>Accede o crea tu cuenta</Text>
            </View>
          </Pressable>
        )}

        {/* 4. Gestión de usuarios (HU-10) — SOLO ADMIN (sin rol moderador) */}
        {isAdmin ? (
          <Pressable
            onPress={() => go("usuarios")}
            style={[styles.item, active === "usuarios" && styles.itemActive]}
            accessibilityRole="button"
            accessibilityLabel="Gestión de usuarios y roles"
          >
            <ShieldCheck
              size={18}
              color={
                active === "usuarios"
                  ? AndeanTheme.colors.primaryLight
                  : AndeanTheme.colors.amberLight
              }
            />
            <View style={styles.itemTextWrap}>
              <Text
                style={[
                  styles.itemTitle,
                  active === "usuarios" && styles.itemTitleActive,
                ]}
              >
                GESTIÓN USUARIOS
              </Text>
              <Text style={styles.itemSub}>RBAC, bitácora y bloqueos</Text>
            </View>
          </Pressable>
        ) : null}
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
  adminBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadgeText: {
    color: AndeanTheme.colors.amberLight,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
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
  itemHighlight: {
    borderColor: AndeanTheme.colors.primaryDark,
    backgroundColor: "rgba(6, 78, 59, 0.2)",
  },
  itemTextWrap: { flex: 1 },
  itemTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  itemTitleActive: { color: AndeanTheme.colors.primaryLight },
  itemTitleHighlight: { color: AndeanTheme.colors.primaryLight },
  itemSub: {
    color: AndeanTheme.colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
});
