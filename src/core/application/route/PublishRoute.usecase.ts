import type {
  RouteModel,
  RoutePreview,
  RoutePublicationArtifacts,
} from "../../domain/types";
import { RoutePublicationArtifactsSchema } from "../../domain/routeArtifacts.schemas";
import { buildRoutePreview } from "../../domain/routePreview";
import { RoutePreviewSchema } from "../../domain/routePreview.schemas";

export interface PublishRouteUpdates {
  status: "published";
  artifacts: RoutePublicationArtifacts;
  preview: RoutePreview;
  updatedAt: number;
}

export interface PublishRoutePorts {
  publish: (routeId: string, updates: PublishRouteUpdates) => Promise<void>;
}

const ARTIFACT_CONTRACT = {
  gpx: {
    fileName: "route.gpx",
    mimeType: "application/gpx+xml",
  },
  pmtiles: {
    fileName: "basemap.pmtiles",
    mimeType: "application/vnd.pmtiles",
  },
} as const;

function expectedStoragePath(
  routeId: string,
  version: number,
  kind: keyof typeof ARTIFACT_CONTRACT,
): string {
  const safeId = routeId.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(safeId)) {
    throw new Error("El id de la ruta no es válido para Storage.");
  }
  return `routes/${safeId}/v${version}/${ARTIFACT_CONTRACT[kind].fileName}`;
}

/** Stable, versioned Storage path shared by publication and offline download. */
export function routeArtifactStoragePath(
  routeId: string,
  version: number,
  kind: "gpx" | "pmtiles",
): string {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("La versión del artefacto debe ser un entero positivo.");
  }
  return expectedStoragePath(routeId, version, kind);
}

/**
 * Pure publication boundary. It rejects partial, mixed-version, wrong-path,
 * wrong-MIME and non-uploaded bundles before Firestore is touched.
 */
export function ValidateRoutePublicationUseCase(
  routeId: string,
  rawArtifacts: unknown,
): RoutePublicationArtifacts {
  const artifacts = RoutePublicationArtifactsSchema.parse(rawArtifacts);
  for (const kind of ["gpx", "pmtiles"] as const) {
    const artifact = artifacts[kind];
    const expected = ARTIFACT_CONTRACT[kind];
    if (artifact.kind !== kind) {
      throw new Error(`El artefacto ${kind} declara un tipo incompatible.`);
    }
    if (artifact.version !== artifacts.version) {
      throw new Error("Los artefactos publicados deben compartir la misma versión.");
    }
    if (artifact.fileName !== expected.fileName || artifact.mimeType !== expected.mimeType) {
      throw new Error(`El contrato MIME/nombre de ${kind} no es válido.`);
    }
    if (artifact.storagePath !== routeArtifactStoragePath(routeId, artifacts.version, kind)) {
      throw new Error(`La ruta Storage de ${kind} no coincide con la versión publicada.`);
    }
    if (artifact.status !== "uploaded") {
      throw new Error(`El artefacto ${kind} todavía no está cargado.`);
    }
  }
  return artifacts;
}

/** Publishes route metadata only; artifact bytes are uploaded through Storage. */
export async function PublishRouteUseCase(
  route: RouteModel,
  rawArtifacts: unknown,
  ports: PublishRoutePorts,
  updatedAt = Date.now(),
): Promise<RouteModel> {
  const artifacts = ValidateRoutePublicationUseCase(route.id, rawArtifacts);
  const preview = route.waypoints.length >= 2
    ? buildRoutePreview(route.waypoints)
    : route.preview
      ? RoutePreviewSchema.parse(route.preview)
      : undefined;
  if (!preview) {
    throw new Error("La ruta necesita al menos dos coordenadas para generar su preview público.");
  }
  const updates: PublishRouteUpdates = {
    status: "published",
    artifacts,
    preview,
    updatedAt,
  };
  await ports.publish(route.id, updates);
  return { ...route, ...updates, waypoints: [] };
}
