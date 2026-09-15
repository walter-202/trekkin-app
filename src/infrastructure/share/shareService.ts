import { Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import type { SharePayload } from "../../core/domain/share.schemas";
import type { ShareSheetResult } from "../../core/application/share/PublishShareLink.usecase";

/**
 * HU-05 — Adaptador de plataforma para compartir (única capa con
 * `react-native` Share / `expo-clipboard` / `expo-linking`).
 * Implementa los puertos de `core/application/share`:
 *  - buildShareUrl: enlace determinístico `r/{routeId}` vía expo-linking
 *    (en Expo Go produce `exp://…/--/r/{id}`, en standalone `trekkin-app://r/{id}`).
 *  - copyToClipboard: portapapeles del dispositivo (expo-clipboard).
 *  - openShareSheet: share sheet nativo (redes sociales/mensajería).
 * No importa `firebase/*` ni duplica la Route.
 */
export const shareService = {
  buildShareUrl(routeId: string): string {
    return Linking.createURL(`r/${routeId}`);
  },

  async copyToClipboard(text: string): Promise<void> {
    await Clipboard.setStringAsync(text);
  },

  async openShareSheet(payload: SharePayload): Promise<ShareSheetResult> {
    if (Platform.OS === "web") return "dismissed";
    try {
      const result = await Share.share({
        // El enlace va dentro del mensaje: garantiza envío en Android y evita
        // que iOS rechace esquemas no-http en `url`.
        message: `${payload.message}\n${payload.url}`,
        title: "Compartir ruta",
      });
      return result.action === "sharedAction" ? "shared" : "dismissed";
    } catch {
      return "dismissed";
    }
  },
};
