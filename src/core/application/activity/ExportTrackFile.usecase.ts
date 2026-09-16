import { buildGPX } from "../../domain/trackFormats";
import type { TrekkinActivity } from "../../domain/types";

export interface ExportTrackResult {
  fileName: string;
  mimeType: string;
  content: string;
}

/**
 * BK-022: Exporta una actividad completada o en progreso a un archivo GPX 1.1 estándar
 * compatible con Garmin, Wikiloc, Strava y Google Earth.
 */
export function ExportTrackFileUseCase(activity: TrekkinActivity): ExportTrackResult {
  if (!activity || !activity.recordedPoints || activity.recordedPoints.length === 0) {
    throw new Error("No hay puntos registrados en la actividad para exportar.");
  }

  const safeTitle = activity.routeTitle
    ? activity.routeTitle.replace(/[^a-zA-Z0-9_\-]/g, "_")
    : "actividad";
  const dateStr = new Date(activity.startedAt).toISOString().slice(0, 10);
  const fileName = `trekkin_${safeTitle}_${dateStr}.gpx`;

  const gpxContent = buildGPX({
    name: `${activity.routeTitle || "Actividad"} - ${activity.userName || "Caminante"}`,
    description: `Grabada con Trekkin App el ${new Date(activity.startedAt).toLocaleString("es-BO")}. Distancia: ${activity.distanceCoveredKm.toFixed(2)} km.`,
    points: activity.recordedPoints,
  });

  return {
    fileName,
    mimeType: "application/gpx+xml",
    content: gpxContent,
  };
}
