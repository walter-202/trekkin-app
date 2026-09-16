import {
  parseGPX,
  parseKML,
  parseCSV,
  simplifyTrack,
  type ParsedTrack,
} from "../../domain/trackFormats";
import type { Coordinates } from "../../domain/types";

export interface ImportTrackParams {
  fileContent: string;
  fileExtension?: "gpx" | "kml" | "csv" | "txt" | string;
  simplify?: boolean;
  toleranceMeters?: number;
}

export interface ImportedTrackResult {
  title: string;
  description?: string;
  waypoints: Coordinates[];
  checkpoints: Array<{ name?: string; lat: number; lng: number }>;
  distanceKm: number;
  elevationGainM: number;
}

/**
 * BK-021: Importa un archivo de ruta (GPX, KML o CSV) para inicializar
 * o precargar un borrador en el planificador (HU-07) o participar en una ruta.
 */
export function ImportTrackFileUseCase(params: ImportTrackParams): ImportedTrackResult {
  const ext = (params.fileExtension || "").toLowerCase().replace(".", "");
  let parsed: ParsedTrack;

  if (ext === "gpx") {
    parsed = parseGPX(params.fileContent);
  } else if (ext === "kml") {
    parsed = parseKML(params.fileContent);
  } else if (ext === "csv" || ext === "txt") {
    parsed = parseCSV(params.fileContent);
  } else {
    // Detección automática por contenido
    if (params.fileContent.includes("<gpx")) {
      parsed = parseGPX(params.fileContent);
    } else if (params.fileContent.includes("<kml")) {
      parsed = parseKML(params.fileContent);
    } else {
      parsed = parseCSV(params.fileContent);
    }
  }

  let finalPoints = parsed.points;
  if (params.simplify !== false && finalPoints.length > 500) {
    finalPoints = simplifyTrack(finalPoints, params.toleranceMeters ?? 10);
  }

  return {
    title: parsed.name || "Ruta Importada",
    description: parsed.description,
    waypoints: finalPoints,
    checkpoints: parsed.waypoints.map((w) => ({
      name: w.name,
      lat: w.lat,
      lng: w.lng,
    })),
    distanceKm: parsed.totalDistanceKm,
    elevationGainM: parsed.elevationGainM,
  };
}
