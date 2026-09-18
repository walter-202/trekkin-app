import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  X,
  Link2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Share as ShareIcon,
} from "lucide-react-native";
import type { RouteModel } from "../../../core/domain/types";
import type { SharePayload } from "../../../core/domain/share.schemas";
import {
  ShareRouteUseCase,
  CopyShareLinkUseCase,
  PublishShareLinkUseCase,
  type ShareSheetResult,
} from "../../../core/application/share";
import { shareService } from "../../../infrastructure/share/shareService";
import { AndeanTheme } from "../../theme";

/**
 * HU-05 — Modal de compartir una ruta publicada (colocalizado en explore,
 * un solo uso). Dueño de su estado: genera el enlace, copia y comparte
 * vía usecases puros con puertos inyectados (shareService). Sin lógica de
 * negocio ni duplicación de Route.
 */
interface ShareModalProps {
  route: RouteModel;
  onClose: () => void;
}

interface ShareRoutes {
  buildShareUrl: (routeId: string) => string;
  copyToClipboard: (text: string) => Promise<void>;
  openShareSheet: (payload: SharePayload) => Promise<ShareSheetResult>;
}

export const ShareModal: React.FC<ShareModalProps> = ({ route, onClose }) => {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Enlace único generado por puerto de plataforma (expo-linking).
  const routes: ShareRoutes = {
    buildShareUrl: (id) => shareService.buildShareUrl(id),
    copyToClipboard: (text) => shareService.copyToClipboard(text),
    openShareSheet: (p) => shareService.openShareSheet(p),
  };

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const result = await ShareRouteUseCase({ route }, routes);
        setPayload(result);
      } catch (err: any) {
        setError(err?.message ?? "No se pudo generar el enlace de la ruta.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id]);

  const handleCopy = async () => {
    if (!payload) return;
    setCopied(false);
    try {
      await CopyShareLinkUseCase(payload, routes);
      setCopied(true);
    } catch {
      setError("No se pudo copiar el enlace. Intenta nuevamente.");
    }
  };

  const handleShareSheet = async () => {
    if (!payload) return;
    setShared(false);
    try {
      await PublishShareLinkUseCase(payload, routes);
      setShared(true);
    } catch {
      setError("No se pudo abrir el medio de envío. Intenta nuevamente.");
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet} accessibilityLabel="Compartir ruta">
          <View style={styles.header}>
            <Text style={styles.title}>Compartir ruta</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Cerrar menú de compartir"
              hitSlop={8}
            >
              <X size={18} color={AndeanTheme.colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={AndeanTheme.colors.primary} />
              <Text style={styles.muted}>Generando enlace…</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBlock}>
              <AlertCircle size={18} color={AndeanTheme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : payload ? (
            <>
              <Text style={styles.routeTitle}>{route.title}</Text>
              {route.region ? (
                <Text style={styles.routeRegion}>{route.region}</Text>
              ) : null}

              <View style={styles.linkBox}>
                <Link2 size={14} color={AndeanTheme.colors.primaryLight} />
                <Text style={styles.linkText} numberOfLines={2}>
                  {payload.url}
                </Text>
              </View>

              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.pressed,
                  copied && styles.actionBtnOn,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Copiar enlace de la ruta"
              >
                {copied ? (
                  <>
                    <CheckCircle2
                      size={16}
                      color={AndeanTheme.colors.primaryLight}
                    />
                    <Text style={styles.actionBtnTextOn}>Enlace copiado</Text>
                  </>
                ) : (
                  <>
                    <Copy size={16} color={AndeanTheme.colors.text} />
                    <Text style={styles.actionBtnText}>Copiar enlace</Text>
                  </>
                )}
              </Pressable>

              {Platform.OS !== "web" ? (
                <Pressable
                  onPress={handleShareSheet}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnPrimary,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Compartir mediante el dispositivo"
                >
                  <ShareIcon size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnPrimaryText}>Compartir…</Text>
                </Pressable>
              ) : null}

              {shared ? (
                <View style={styles.successBlock}>
                  <CheckCircle2 size={16} color={AndeanTheme.colors.primary} />
                  <Text style={styles.successText}>
                    Ruta compartida exitosamente.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {!loading && !error && copied ? (
            <Text style={styles.footnote}>
              El enlace permite recuperar esta ruta con todos sus datos.
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: AndeanTheme.colors.card,
    borderTopLeftRadius: AndeanTheme.borderRadius.xl,
    borderTopRightRadius: AndeanTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    padding: AndeanTheme.spacing.lg,
    gap: AndeanTheme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: AndeanTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
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
  center: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  muted: { color: AndeanTheme.colors.textSecondary, fontSize: 12 },
  routeTitle: {
    color: AndeanTheme.colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  routeRegion: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingHorizontal: AndeanTheme.spacing.sm,
    paddingVertical: 10,
  },
  linkText: {
    flex: 1,
    color: AndeanTheme.colors.primaryLight,
    fontSize: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AndeanTheme.colors.border,
    borderRadius: AndeanTheme.borderRadius.md,
    paddingVertical: 13,
    minHeight: 48,
  },
  actionBtnOn: {
    borderColor: AndeanTheme.colors.primary,
  },
  actionBtnPrimary: {
    backgroundColor: AndeanTheme.colors.primaryDark,
  },
  pressed: { opacity: 0.8 },
  actionBtnText: {
    color: AndeanTheme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtnTextOn: {
    color: AndeanTheme.colors.primaryLight,
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  errorBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: AndeanTheme.borderRadius.md,
    padding: 10,
  },
  errorText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
  },
  successBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: AndeanTheme.colors.borderLight,
    borderRadius: AndeanTheme.borderRadius.md,
    padding: 10,
  },
  successText: {
    flex: 1,
    color: AndeanTheme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  footnote: {
    color: AndeanTheme.colors.textMuted,
    fontSize: 10,
    textAlign: "center",
  },
});
