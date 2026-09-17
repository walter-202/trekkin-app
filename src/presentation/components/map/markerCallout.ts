import { AndeanTheme } from "../../theme";
import type { SceneMarkerKind } from "../../../infrastructure/map/mapBridge";

export const MARKER_ROLE_LABEL: Record<SceneMarkerKind, string> = {
  start: "Punto inicial",
  end: "Punto final",
  checkpoint: "Punto de parada",
  user: "Tu posición",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCalloutHtml(
  kind: SceneMarkerKind | string,
  name?: string,
  notes?: string,
): string {
  const role =
    MARKER_ROLE_LABEL[kind as SceneMarkerKind] ?? MARKER_ROLE_LABEL.checkpoint;
  const title = (name && name.trim()) || role;
  const extra = notes?.trim();
  const extraHtml = extra
    ? `<p class="trekkin-popup-notes">${escapeHtml(extra)}</p>`
    : "";
  const showRole = title !== role;
  return `<div class="trekkin-popup-card">
    ${showRole ? `<p class="trekkin-popup-role">${escapeHtml(role)}</p>` : ""}
    <p class="trekkin-popup-title">${escapeHtml(title)}</p>
    ${extraHtml}
  </div>`;
}

export const CALLOUT_CSS = `
.trekkin-popup .maplibregl-popup-content {
  background: ${AndeanTheme.colors.card};
  color: ${AndeanTheme.colors.text};
  border: 1px solid ${AndeanTheme.colors.border};
  border-radius: 12px;
  padding: 10px 12px 10px 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.35);
  min-width: 140px;
  max-width: 220px;
}
.trekkin-popup .maplibregl-popup-tip {
  border-top-color: ${AndeanTheme.colors.card};
}
.trekkin-popup .maplibregl-popup-close-button {
  color: ${AndeanTheme.colors.textSecondary};
  font-size: 18px;
  padding: 0 6px;
}
.trekkin-popup-card { margin: 0; padding-right: 12px; }
.trekkin-popup-role {
  margin: 0 0 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${AndeanTheme.colors.primaryLight};
}
.trekkin-popup-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${AndeanTheme.colors.text};
}
.trekkin-popup-notes {
  margin: 4px 0 0;
  font-size: 12px;
  color: ${AndeanTheme.colors.textSecondary};
}
`;
