import type { Coordinates } from "./types";
import { haversineKm, distanceM } from "./calculations";

export interface WaypointItem {
  lat: number;
  lng: number;
  name?: string;
  desc?: string;
  altitude?: number;
}

export interface ParsedTrack {
  name?: string;
  description?: string;
  points: Coordinates[];
  waypoints: WaypointItem[];
  totalDistanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
}

/**
 * Escapes XML entities for safe GPX/KML output.
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

/**
 * Calculates total distance and elevation gain/loss for a list of coordinates.
 */
export function computeElevationStats(points: Coordinates[]): {
  totalDistanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
} {
  let totalDistanceKm = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    totalDistanceKm += haversineKm(prev, curr);

    if (prev.altitude !== undefined && curr.altitude !== undefined) {
      const diff = curr.altitude - prev.altitude;
      // Umbral mínimo de 1.5m para filtrar jitter barométrico/GPS
      if (diff > 1.5) {
        elevationGainM += diff;
      } else if (diff < -1.5) {
        elevationLossM += Math.abs(diff);
      }
    }
  }

  return {
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM),
  };
}

/**
 * Parses standard GPX 1.0 or 1.1 XML string.
 * Extracts tracks, track segments, track points, elevation, time, and waypoints.
 */
export function parseGPX(xml: string): ParsedTrack {
  if (!xml || typeof xml !== "string") {
    throw new Error("El archivo GPX está vacío o no es un texto válido.");
  }

  // Extrae nombre del track
  const nameMatch = xml.match(/<name>(.*?)<\/name>/i);
  const name = nameMatch ? nameMatch[1].trim() : undefined;

  // Extrae descripción
  const descMatch = xml.match(/<desc>(.*?)<\/desc>/i);
  const description = descMatch ? descMatch[1].trim() : undefined;

  const points: Coordinates[] = [];
  const waypoints: WaypointItem[] = [];

  // 1. Extraer Waypoints (<wpt lat="..." lon="...">)
  const wptRegex = /<wpt\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wpt>/gi;
  let wptMatch: RegExpExecArray | null;

  while ((wptMatch = wptRegex.exec(xml)) !== null) {
    const lat = parseFloat(wptMatch[1]);
    const lng = parseFloat(wptMatch[2]);
    const body = wptMatch[3];

    const wptNameMatch = body.match(/<name>(.*?)<\/name>/i);
    const wptDescMatch = body.match(/<desc>(.*?)<\/desc>/i);
    const wptEleMatch = body.match(/<ele>(.*?)<\/ele>/i);

    if (!isNaN(lat) && !isNaN(lng)) {
      waypoints.push({
        lat,
        lng,
        name: wptNameMatch ? wptNameMatch[1].trim() : undefined,
        desc: wptDescMatch ? wptDescMatch[1].trim() : undefined,
        altitude: wptEleMatch ? parseFloat(wptEleMatch[1]) : undefined,
      });
    }
  }

  // 2. Extraer Puntos de Track (<trkpt lat="..." lon="..."> o con lon antes de lat)
  const trkptRegex = /<trkpt\s+([^>]+)>([\s\S]*?)<\/trkpt>/gi;
  let trkMatch: RegExpExecArray | null;

  while ((trkMatch = trkptRegex.exec(xml)) !== null) {
    const attrs = trkMatch[1];
    const body = trkMatch[2];

    const latMatch = attrs.match(/lat=["']([^"']+)["']/i);
    const lonMatch = attrs.match(/lon=["']([^"']+)["']/i);

    if (latMatch && lonMatch) {
      const lat = parseFloat(latMatch[1]);
      const lng = parseFloat(lonMatch[1]);

      if (!isNaN(lat) && !isNaN(lng)) {
        const eleMatch = body.match(/<ele>(.*?)<\/ele>/i);
        const timeMatch = body.match(/<time>(.*?)<\/time>/i);

        const point: Coordinates = {
          lat,
          lng,
          altitude: eleMatch ? parseFloat(eleMatch[1]) : undefined,
          timestamp: timeMatch ? new Date(timeMatch[1]).getTime() : undefined,
        };
        points.push(point);
      }
    }
  }

  // Si no había <trkpt>, buscar <rtept> (rutas)
  if (points.length === 0) {
    const rteptRegex = /<rtept\s+([^>]+)>([\s\S]*?)<\/rtept>/gi;
    let rteMatch: RegExpExecArray | null;

    while ((rteMatch = rteptRegex.exec(xml)) !== null) {
      const attrs = rteMatch[1];
      const body = rteMatch[2];
      const latMatch = attrs.match(/lat=["']([^"']+)["']/i);
      const lonMatch = attrs.match(/lon=["']([^"']+)["']/i);

      if (latMatch && lonMatch) {
        const lat = parseFloat(latMatch[1]);
        const lng = parseFloat(lonMatch[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          const eleMatch = body.match(/<ele>(.*?)<\/ele>/i);
          points.push({
            lat,
            lng,
            altitude: eleMatch ? parseFloat(eleMatch[1]) : undefined,
          });
        }
      }
    }
  }

  if (points.length === 0 && waypoints.length === 0) {
    throw new Error("El archivo GPX no contiene puntos de track ni waypoints legibles.");
  }

  const stats = computeElevationStats(points);

  return {
    name,
    description,
    points,
    waypoints,
    totalDistanceKm: stats.totalDistanceKm,
    elevationGainM: stats.elevationGainM,
    elevationLossM: stats.elevationLossM,
  };
}

/**
 * Builds standard GPX 1.1 XML string compatible with Garmin, Wikiloc, Strava, and Google Earth.
 */
export function buildGPX(track: {
  name: string;
  description?: string;
  points: Coordinates[];
  waypoints?: WaypointItem[];
}): string {
  const safeName = escapeXml(track.name || "Ruta Trekkin");
  const safeDesc = track.description ? `<desc>${escapeXml(track.description)}</desc>` : "";
  const nowIso = new Date().toISOString();

  let waypointsXml = "";
  if (track.waypoints && track.waypoints.length > 0) {
    waypointsXml = track.waypoints
      .map((w) => {
        const nameTag = w.name ? `<name>${escapeXml(w.name)}</name>` : "";
        const descTag = w.desc ? `<desc>${escapeXml(w.desc)}</desc>` : "";
        const eleTag = w.altitude !== undefined ? `<ele>${w.altitude}</ele>` : "";
        return `  <wpt lat="${w.lat}" lon="${w.lng}">\n    ${nameTag}\n    ${descTag}\n    ${eleTag}\n  </wpt>`;
      })
      .join("\n") + "\n";
  }

  let trkptsXml = "";
  if (track.points && track.points.length > 0) {
    trkptsXml = track.points
      .map((p) => {
        const eleTag = p.altitude !== undefined ? `<ele>${p.altitude}</ele>` : "";
        const timeTag = p.timestamp ? `<time>${new Date(p.timestamp).toISOString()}</time>` : "";
        return `      <trkpt lat="${p.lat}" lon="${p.lng}">\n        ${eleTag}\n        ${timeTag}\n      </trkpt>`;
      })
      .join("\n");
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trekkin App Bolivia - https://trekkin.app" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${safeName}</name>
    ${safeDesc}
    <time>${nowIso}</time>
  </metadata>
${waypointsXml}  <trk>
    <name>${safeName}</name>
    <trkseg>
${trkptsXml}
    </trkseg>
  </trk>
</gpx>`;
}

/** Alias cruz BK-020: el serializador canónico es GPX 1.1. */
export const buildGPX11 = buildGPX;

export interface GeoJsonFeature {
  type: "Feature";
  properties: {
    name?: string;
    description?: string;
    role?: string;
  };
  geometry:
    | { type: "LineString"; coordinates: number[][] }
    | { type: "Point"; coordinates: number[] };
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

/**
 * Capa de usuario (cruz): GPX → GeoJSON para MapLibre / intercambio.
 * Coordinates GeoJSON son [lng, lat] (y altitud si existe).
 */
export function toGeoJSON(track: {
  name?: string;
  description?: string;
  points: Coordinates[];
  waypoints?: WaypointItem[];
}): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];
  if (track.points && track.points.length > 0) {
    features.push({
      type: "Feature",
      properties: {
        name: track.name,
        description: track.description,
        role: "track",
      },
      geometry: {
        type: "LineString",
        coordinates: track.points.map((p) =>
          p.altitude !== undefined ? [p.lng, p.lat, p.altitude] : [p.lng, p.lat],
        ),
      },
    });
  }
  if (track.waypoints) {
    for (const w of track.waypoints) {
      features.push({
        type: "Feature",
        properties: {
          name: w.name,
          description: w.desc,
          role: "waypoint",
        },
        geometry: {
          type: "Point",
          coordinates:
            w.altitude !== undefined ? [w.lng, w.lat, w.altitude] : [w.lng, w.lat],
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

/**
 * Parses KML format and extracts coordinates from <LineString> or <Point>.
 */
export function parseKML(kml: string): ParsedTrack {
  if (!kml || typeof kml !== "string") {
    throw new Error("El archivo KML está vacío o no es válido.");
  }

  const nameMatch = kml.match(/<name>(.*?)<\/name>/i);
  const name = nameMatch ? nameMatch[1].trim() : undefined;

  const points: Coordinates[] = [];

  // Busca bloques <coordinates>...</coordinates>
  const coordsRegex = /<coordinates>([\s\S]*?)<\/coordinates>/gi;
  let match: RegExpExecArray | null;

  while ((match = coordsRegex.exec(kml)) !== null) {
    const raw = match[1].trim();
    // Los puntos en KML están separados por espacios o saltos de línea: "lng,lat,alt lng,lat,alt"
    const tuples = raw.split(/\s+/);
    for (const tuple of tuples) {
      const parts = tuple.split(",");
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const altitude = parts.length > 2 ? parseFloat(parts[2]) : undefined;

        if (!isNaN(lat) && !isNaN(lng)) {
          points.push({ lat, lng, altitude });
        }
      }
    }
  }

  if (points.length === 0) {
    throw new Error("No se encontraron coordenadas válidas en el archivo KML.");
  }

  const stats = computeElevationStats(points);

  return {
    name,
    points,
    waypoints: [],
    totalDistanceKm: stats.totalDistanceKm,
    elevationGainM: stats.elevationGainM,
    elevationLossM: stats.elevationLossM,
  };
}

/**
 * Parses CSV files with headers: lat, lng/lon, altitude/ele, timestamp/time.
 */
export function parseCSV(csv: string): ParsedTrack {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error("El archivo CSV no contiene suficientes líneas de datos.");
  }

  // Detecta delimitador (, o ;)
  const headerLine = lines[0];
  const delim = headerLine.includes(";") ? ";" : ",";
  const headers = headerLine.split(delim).map((h) => h.trim().toLowerCase());

  const latIdx = headers.findIndex((h) => h.includes("lat"));
  const lngIdx = headers.findIndex((h) => h.includes("lng") || h.includes("lon"));
  const eleIdx = headers.findIndex((h) => h.includes("alt") || h.includes("ele"));
  const timeIdx = headers.findIndex((h) => h.includes("time") || h.includes("fecha"));

  if (latIdx === -1 || lngIdx === -1) {
    throw new Error("El CSV debe contener columnas de latitud (lat) y longitud (lng/lon).");
  }

  const points: Coordinates[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim());
    if (cols.length <= Math.max(latIdx, lngIdx)) continue;

    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    const altitude = eleIdx !== -1 && cols[eleIdx] ? parseFloat(cols[eleIdx]) : undefined;
    const timestamp = timeIdx !== -1 && cols[timeIdx] ? new Date(cols[timeIdx]).getTime() : undefined;

    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({ lat, lng, altitude, timestamp: isNaN(timestamp as number) ? undefined : timestamp });
    }
  }

  if (points.length === 0) {
    throw new Error("No se pudieron extraer coordenadas válidas del CSV.");
  }

  const stats = computeElevationStats(points);

  return {
    points,
    waypoints: [],
    totalDistanceKm: stats.totalDistanceKm,
    elevationGainM: stats.elevationGainM,
    elevationLossM: stats.elevationLossM,
  };
}

/**
 * Perpendicular distance in meters from point P to line segment AB.
 */
function perpendicularDistanceM(p: Coordinates, a: Coordinates, b: Coordinates): number {
  const lineDist = distanceM(a, b);
  if (lineDist === 0) return distanceM(p, a);

  // Proyección escalar sobre el segmento
  const distAtoP = distanceM(a, p);
  const distBtoP = distanceM(b, p);

  // Fórmula de Herón para el área del triángulo formado por A, B, P
  const s = (lineDist + distAtoP + distBtoP) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - lineDist) * (s - distAtoP) * (s - distBtoP)));

  // Altura = 2 * Área / Base
  return (2 * area) / lineDist;
}

/**
 * Simplifies a sequence of GPS points using the Ramer-Douglas-Peucker algorithm.
 * Drastically reduces points while preserving route curvature within tolerance in meters.
 */
export function simplifyTrack(
  points: Coordinates[],
  toleranceMeters: number = 8
): Coordinates[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const last = points.length - 1;

  for (let i = 1; i < last; i++) {
    const d = perpendicularDistanceM(points[i], points[0], points[last]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > toleranceMeters) {
    const recResults1 = simplifyTrack(points.slice(0, index + 1), toleranceMeters);
    const recResults2 = simplifyTrack(points.slice(index), toleranceMeters);

    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[last]];
  }
}
