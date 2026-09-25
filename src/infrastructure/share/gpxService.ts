import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { buildGPX } from "../../core/domain/trackFormats";
import type { Coordinates } from "../../core/domain/types";

export interface GpxRoutePoint extends Coordinates {
  lat: number;
  lng: number;
  altitude?: number;
  timestamp?: number;
}

export interface GpxExportOptions {
  name?: string;
  description?: string;
  fileName?: string;
}

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "ruta";

export function buildGpxXmlString(
  name: string,
  description: string | undefined,
  points: GpxRoutePoint[],
): string {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("El recorrido GPX no tiene puntos válidos para exportar.");
  }

  return buildGPX({
    name: name || "Ruta Trekkin",
    description,
    points: points.map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
      altitude: point.altitude,
      timestamp: point.timestamp,
    })),
  });
}

export async function writeGpxTempFile(
  points: GpxRoutePoint[],
  options: GpxExportOptions = {},
): Promise<{ uri: string; fileName: string; xml: string }> {
  const name = options.name?.trim() || "Ruta Trekkin";
  const description = options.description;
  const xml = buildGpxXmlString(name, description, points);
  const fileName = (options.fileName || `${slugify(name)}.gpx`).replace(/\s+/g, "_");

  const directory = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "/tmp/"}gpx-exports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, xml, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { uri, fileName, xml };
}

export async function shareGpxFromCoordinates(
  points: GpxRoutePoint[],
  options: GpxExportOptions = {},
): Promise<{ uri: string; fileName: string; shared: boolean }> {
  const file = await writeGpxTempFile(points, options);
  const available = await Sharing.isAvailableAsync();

  if (!available) {
    return { ...file, shared: false };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/gpx+xml",
    UTI: "com.topografix.gpx",
    dialogTitle: `Compartir ${file.fileName}`,
  });

  return { ...file, shared: true };
}
