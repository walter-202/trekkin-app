/**
 * Clean Architecture - Core Domain Types
 * Independent of Framework, UI, and external libraries.
 * 100% compatible with Expo SDK 57 / React Native.
 */

export type UserRole = "user" | "admin";

export type RouteDifficulty = "facil" | "moderado" | "dificil" | "experto";

export type RouteModality = "solo" | "acompañado";

export type RouteStatus = "draft" | "in_review" | "published" | "rejected";

/** Published route artifacts are metadata only; bytes live in Firebase Storage. */
export type RouteArtifactKind = "gpx" | "pmtiles";

export type RouteArtifactStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed";

export interface RouteArtifactMetadata {
  kind: RouteArtifactKind;
  version: number;
  storagePath: string;
  fileName: "route.gpx" | "basemap.pmtiles";
  mimeType: "application/gpx+xml" | "application/vnd.pmtiles";
  byteSize: number;
  sha256: string;
  status: RouteArtifactStatus;
  updatedAt: number;
  error?: string;
}

/** A published bundle is complete only when both artifacts share one version. */
export interface RoutePublicationArtifacts {
  version: number;
  gpx: RouteArtifactMetadata;
  pmtiles: RouteArtifactMetadata;
}

export type CheckpointCategory =
  | "agua"
  | "camping"
  | "peligro"
  | "vista"
  | "descanso"
  | "flora_fauna"
  | "refugio";

export type ActivityStatus =
  "in_progress" | "paused" | "completed" | "incomplete";

/** Lifecycle of the private GPX artifact associated with a finished activity. */
export type ActivityGpxUploadStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed";

/** Firestore metadata only; the GPX bytes live in owner-scoped Storage. */
export interface ActivityGpxMetadata {
  storagePath: string;
  fileName: string;
  mimeType: "application/gpx+xml";
  byteSize?: number;
  sha256?: string;
  status: ActivityGpxUploadStatus;
  updatedAt: number;
  error?: string;
}

/** Origen de una actividad: libre (GRABAR RUTA), ruta (ACTIVIDAD GPS) o plan (HU-07). */
export type LiveActivityOrigin = "free" | "route" | "plan";

export interface Coordinates {
  lat: number;
  lng: number;
  altitude?: number;
  timestamp?: number;
  /** Precisión GPS en metros (HU-08: se descarta si supera MAX_ACCURACY_M). */
  accuracy?: number;
}

export interface Checkpoint {
  id: string;
  name: string;
  category: CheckpointCategory;
  lat: number;
  lng: number;
  notes?: string;
  photoUrl?: string;
  createdAt: number;
}

export interface RouteModel {
  id: string;
  title: string;
  description: string;
  region: string;
  startPoint: {
    name: string;
    lat: number;
    lng: number;
  };
  endPoint: {
    name: string;
    lat: number;
    lng: number;
  };
  distanceKm: number;
  durationMinutes: number;
  elevationGainM?: number;
  difficulty: RouteDifficulty;
  modality: RouteModality;
  status: RouteStatus;
  isPrivate: boolean;
  creatorId: string;
  creatorName: string;
  waypoints: Coordinates[];
  checkpoints: Checkpoint[];
  photos: string[];
  coverImageUrl?: string;
  moderationNotes?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
  isOfflineCached?: boolean;
  estimatedOfflineSizeMB?: number;
  /** Firestore metadata for the published GPX + PMTiles Storage bundle. */
  artifacts?: RoutePublicationArtifacts;
}

export interface TrekkinActivity {
  id: string;
  userId: string;
  userName: string;
  routeId: string;
  routeTitle: string;
  status: ActivityStatus;
  startedAt: number;
  finishedAt?: number;
  distanceCoveredKm: number;
  remainingDistanceKm: number;
  durationSeconds: number;
  recordedPoints: Coordinates[];
  /** Optional Storage/Firestore metadata. Never contains GPS point arrays. */
  gpx?: ActivityGpxMetadata;
  completedCheckpoints: string[];
  isSynced: boolean;
  createdAt: number;
  /** Flujo que originó la actividad (oculta RESTANTE en UI si es `free`). */
  origin?: LiveActivityOrigin;
}

export type TrekkingActivity = TrekkinActivity;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  summitsCount?: number;
  gpsAccuracy?: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: number;
  bio?: string;
  bloodType?: string;
  emergencyContact?: string;
  totalDistanceKm?: number;
  recordedRoutesCount?: number;
  themePreference?: "dark" | "light" | "high_contrast";
}

/** HU-10 — Acciones de administración registradas en bitácora (T7). */
export type AccountAction = "block" | "unblock" | "role_change";

/** HU-10 — Entrada de bitácora de gestión de cuentas (T7). */
export interface AccountLogEntry {
  id: string;
  userId: string;
  action: AccountAction;
  actorId: string;
  actorName?: string;
  previousRole?: UserRole;
  newRole?: UserRole;
  createdAt: number;
}

export type TabKey =
  "explore" | "activity" | "record" | "profile" | "auth" | "tests";
