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

  /**
   * HU-08 — Entrega un .gpx: descarga en web, share sheet en nativo.
   */
  async shareGpxFile(fileName: string, content: string): Promise<void> {
    const g = globalThis as {
      document?: {
        createElement: (tag: string) => {
          href: string;
          download: string;
          click: () => void;
          remove: () => void;
        };
        body?: { appendChild: (node: unknown) => void };
      };
      Blob?: new (parts: string[], opts: { type: string }) => Blob;
      URL?: { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void };
    };
    if (Platform.OS === "web" && g.document && g.Blob && g.URL) {
      const blob = new g.Blob([content], { type: "application/gpx+xml" });
      const url = g.URL.createObjectURL(blob);
      const link = g.document.createElement("a");
      link.href = url;
      link.download = fileName;
      g.document.body?.appendChild(link);
      link.click();
      link.remove();
      g.URL.revokeObjectURL(url);
      return;
    }
    await Share.share({
      title: fileName,
      message: content,
    });
  },
};
