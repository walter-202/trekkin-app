import type { SQLiteBindParams, SQLiteRunResult } from "expo-sqlite";

/**
 * T4 — Repositorio SQLite para tracks GPS.
 * Persiste cabeceras de actividad + puntos con `seq` incremental, sin
 * reescribir toda la ruta por cada fix. The activity store owns sequencing
 * and uses this repository for incremental writes and recovery.
 *
 * La conexión es inyectable (`TrackDbConnection`) para probar la lógica
 * bajo `tsx`/node sin el módulo nativo.
 */

export const TRACK_DB_NAME = "trekkin.db";

/** Versión de esquema; subir al agregar migraciones futuras. */
export const TRACK_DB_SCHEMA_VERSION = 1;

export interface ActivityHeader {
  id: string;
  userId: string;
  routeId: string;
  routeTitle: string;
  origin?: string | null;
  status: string;
  startedAt: number;
  finishedAt?: number | null;
  distanceKm?: number | null;
  durationSec?: number | null;
  synced?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface TrackPointRow {
  activityId: string;
  seq: number;
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface NewTrackPoint {
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: number;
}

/** Subconjunto síncrono de `expo-sqlite` usado por este repositorio. */
export interface TrackDbConnection {
  execSync(sql: string): void;
  runSync(sql: string, params: SQLiteBindParams): SQLiteRunResult;
  getFirstSync<T>(sql: string, params: SQLiteBindParams): T | null;
  getAllSync<T>(sql: string, params: SQLiteBindParams): T[];
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  routeId TEXT NOT NULL,
  routeTitle TEXT NOT NULL,
  origin TEXT,
  status TEXT NOT NULL,
  startedAt INTEGER NOT NULL,
  finishedAt INTEGER,
  distanceKm REAL NOT NULL DEFAULT 0,
  durationSec INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS track_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activityId TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  altitude REAL,
  accuracy REAL,
  speed REAL,
  timestamp INTEGER NOT NULL,
  UNIQUE(activityId, seq)
);
CREATE INDEX IF NOT EXISTS idx_track_activity_seq
  ON track_points(activityId, seq);
`;

function toHeader(row: Record<string, unknown>): ActivityHeader {
  return {
    id: String(row.id),
    userId: String(row.userId),
    routeId: String(row.routeId),
    routeTitle: String(row.routeTitle),
    origin: (row.origin as string | null) ?? null,
    status: String(row.status),
    startedAt: Number(row.startedAt),
    finishedAt: (row.finishedAt as number | null) ?? null,
    distanceKm: (row.distanceKm as number | null) ?? 0,
    durationSec: (row.durationSec as number | null) ?? 0,
    synced: (row.synced as number | null) ?? 0,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function toPoint(row: Record<string, unknown>): TrackPointRow {
  return {
    activityId: String(row.activityId),
    seq: Number(row.seq),
    lat: Number(row.lat),
    lng: Number(row.lng),
    altitude: (row.altitude as number | null) ?? null,
    accuracy: (row.accuracy as number | null) ?? null,
    speed: (row.speed as number | null) ?? null,
    timestamp: Number(row.timestamp),
  };
}

export function openTrackDbConnection(): TrackDbConnection {
  // Importación perezosa: el módulo nativo solo existe en el dispositivo
  // (Expo Go / dev build), nunca bajo `tsx`/node en las suites de tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require("expo-sqlite") as typeof import("expo-sqlite");
  return SQLite.openDatabaseSync(TRACK_DB_NAME);
}

/** Crea el esquema si no existe y aplica migraciones idempotentes. */
export function migrateTrackDb(db: TrackDbConnection): void {
  const current = db.getFirstSync<{ user_version: number }>(
    "PRAGMA user_version",
    [],
  );
  const version = current?.user_version ?? 0;
  if (version < 1) {
    db.execSync("PRAGMA foreign_keys = ON;");
    db.execSync(SCHEMA_SQL);
    db.execSync(`PRAGMA user_version = ${TRACK_DB_SCHEMA_VERSION};`);
  }
}

export function getTrackDbVersion(db: TrackDbConnection): number {
  const row = db.getFirstSync<{ user_version: number }>(
    "PRAGMA user_version",
    [],
  );
  return row?.user_version ?? 0;
}

export function saveActivityHeader(
  db: TrackDbConnection,
  header: ActivityHeader,
): void {
  db.runSync(
    `INSERT INTO activities
      (id, userId, routeId, routeTitle, origin, status, startedAt, finishedAt,
       distanceKm, durationSec, synced, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       routeTitle = excluded.routeTitle,
       origin = excluded.origin,
       status = excluded.status,
       finishedAt = excluded.finishedAt,
       distanceKm = excluded.distanceKm,
       durationSec = excluded.durationSec,
       synced = excluded.synced,
       updatedAt = excluded.updatedAt`,
    [
      header.id,
      header.userId,
      header.routeId,
      header.routeTitle,
      header.origin ?? null,
      header.status,
      header.startedAt,
      header.finishedAt ?? null,
      header.distanceKm ?? 0,
      header.durationSec ?? 0,
      header.synced ?? 0,
      header.createdAt,
      header.updatedAt,
    ],
  );
}

export function updateActivityHeader(
  db: TrackDbConnection,
  id: string,
  patch: Partial<
    Pick<
      ActivityHeader,
      | "routeTitle"
      | "origin"
      | "status"
      | "finishedAt"
      | "distanceKm"
      | "durationSec"
      | "synced"
      | "updatedAt"
    >
  >,
): void {
  const keys = Object.keys(patch) as Array<keyof typeof patch>;
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const params = keys.map((k) => patch[k] ?? null);
  db.runSync(`UPDATE activities SET ${sets} WHERE id = ?`, [...params, id]);
}

export function getActivityHeader(
  db: TrackDbConnection,
  id: string,
): ActivityHeader | null {
  const row = db.getFirstSync<Record<string, unknown>>(
    "SELECT * FROM activities WHERE id = ?",
    [id],
  );
  return row ? toHeader(row) : null;
}

/** Inserta UN punto (append). Devuelve el `seq` asignado por el llamante. */
export function insertTrackPoint(
  db: TrackDbConnection,
  activityId: string,
  seq: number,
  point: NewTrackPoint,
): void {
  db.runSync(
    `INSERT INTO track_points
      (activityId, seq, lat, lng, altitude, accuracy, speed, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activityId,
      seq,
      point.lat,
      point.lng,
      point.altitude ?? null,
      point.accuracy ?? null,
      point.speed ?? null,
      point.timestamp,
    ],
  );
}

/**
 * Resumable legacy backfill. `startSeq` is the first missing sequence, so a
 * process interruption leaves already committed rows intact and a retry only
 * appends the remaining suffix.
 */
export function backfillTrackPoints(
  db: TrackDbConnection,
  activityId: string,
  points: NewTrackPoint[],
  startSeq: number = 1,
): number {
  let nextSeq = startSeq;
  for (const point of points) {
    insertTrackPoint(db, activityId, nextSeq, point);
    nextSeq += 1;
  }
  return nextSeq;
}

/** Máximo `seq` persistido (0 si la actividad aún no tiene puntos). */
export function getMaxSeq(db: TrackDbConnection, activityId: string): number {
  const row = db.getFirstSync<{ maxSeq: number | null }>(
    "SELECT MAX(seq) AS maxSeq FROM track_points WHERE activityId = ?",
    [activityId],
  );
  return row?.maxSeq ?? 0;
}

export function countTrackPoints(
  db: TrackDbConnection,
  activityId: string,
): number {
  const row = db.getFirstSync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM track_points WHERE activityId = ?",
    [activityId],
  );
  return row?.n ?? 0;
}

/** Últimos N puntos en orden cronológico (`seq` ascendente). */
export function getLastTrackPoints(
  db: TrackDbConnection,
  activityId: string,
  limit: number,
): TrackPointRow[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM track_points WHERE activityId = ?
     ORDER BY seq DESC LIMIT ?`,
    [activityId, limit],
  );
  return rows.map(toPoint).reverse();
}

/** Página ordenada por `seq` (para GPX/export y sync por chunks). */
export function getTrackPointsPage(
  db: TrackDbConnection,
  activityId: string,
  limit: number,
  offset: number,
): TrackPointRow[] {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM track_points WHERE activityId = ?
     ORDER BY seq ASC LIMIT ? OFFSET ?`,
    [activityId, limit, offset],
  );
  return rows.map(toPoint);
}

export function loadTrackPoints(
  db: TrackDbConnection,
  activityId: string,
  pageSize: number = 2000,
): TrackPointRow[] {
  const total = countTrackPoints(db, activityId);
  const rows: TrackPointRow[] = [];
  for (let offset = 0; offset < total; offset += pageSize) {
    rows.push(...getTrackPointsPage(db, activityId, pageSize, offset));
  }
  return rows;
}

export function deleteActivity(db: TrackDbConnection, id: string): void {
  db.runSync("DELETE FROM track_points WHERE activityId = ?", [id]);
  db.runSync("DELETE FROM activities WHERE id = ?", [id]);
}
