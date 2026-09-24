import {
  TRACK_DB_SCHEMA_VERSION,
  backfillTrackPoints,
  countTrackPoints,
  deleteActivity,
  getActivityHeader,
  getLastTrackPoints,
  getMaxSeq,
  getTrackDbVersion,
  getTrackPointsPage,
  insertTrackPoint,
  migrateTrackDb,
  saveActivityHeader,
  updateActivityHeader,
} from "@/infrastructure/database/activityTrackDb";
import { ACTIVITY_CONFIG } from "@/core/domain/activity";
import type {
  ActivityHeader,
  NewTrackPoint,
  TrackDbConnection,
} from "@/infrastructure/database/activityTrackDb";

interface TestResult {
  id: string;
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `TRACKDB-${results.length + 1}`,
    criterion,
    passed,
    detail,
  });
}

/**
 * Mock en memoria de `TrackDbConnection`: emula DDL/PRAGMA y las consultas
 * exactas que usa el repositorio (sin motor SQL real). Sirve para `tsx`.
 * Se tipa con `any` para evitar problemas de tipos con `SQLiteBindParams`.
 */
function createMemoryDb(failAfterInserts: number | null = null): TrackDbConnection & {
  version: number;
  setFailureAfter: (value: number | null) => void;
} {
  const state: any = {
    version: 0,
    activities: new Map<string, Record<string, unknown>>(),
    points: [] as Array<Record<string, unknown>>,
    inserts: 0,
    failAfterInserts,
  };

  return {
    get version() {
      return state.version;
    },
    setFailureAfter(value: number | null): void {
      state.failAfterInserts = value;
    },
    execSync(sql: string): void {
      const m = sql.match(/PRAGMA\s+user_version\s*=\s*(\d+)/i);
      if (m) {
        state.version = Number(m[1]);
        return;
      }
    },
    runSync(
      sql: string,
      params: any[],
    ): { lastInsertRowId: number; changes: number } {
      const args = Array.isArray(params) ? params : [];
      const upper = sql.toUpperCase();
      if (sql.toUpperCase().includes("INSERT INTO ACTIVITIES")) {
        const cols = [
          "id",
          "userId",
          "routeId",
          "routeTitle",
          "origin",
          "status",
          "startedAt",
          "finishedAt",
          "distanceKm",
          "durationSec",
          "synced",
          "createdAt",
          "updatedAt",
        ];
        const row: Record<string, unknown> = {};
        cols.forEach((c, i) => {
          row[c] = args[i] ?? null;
        });
        state.activities.set(String(row.id), {
          ...state.activities.get(String(row.id)),
          ...row,
        });
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (sql.toUpperCase().includes("UPDATE ACTIVITIES SET")) {
        const setPart = sql.split(/SET/i)[1].split(/WHERE/i)[0];
        const cols = setPart.split(",").map((s) => s.trim().split(" ")[0]);
        const id = String(args[args.length - 1]);
        const prev = state.activities.get(id);
        if (prev) {
          cols.forEach((c, i) => {
            prev[c] = args[i] ?? null;
          });
        }
        return { lastInsertRowId: 0, changes: prev ? 1 : 0 };
      }
      if (sql.toUpperCase().includes("INSERT INTO TRACK_POINTS")) {
        if (
          state.failAfterInserts != null &&
          state.inserts >= state.failAfterInserts
        ) {
          throw new Error("simulated interruption during backfill");
        }
        if (
          state.points.some(
            (p: (typeof state.points)[0]) =>
              p.activityId === params[0] && p.seq === params[1],
          )
        ) {
          throw new Error(
            "UNIQUE constraint failed: track_points.activityId, seq",
          );
        }
        state.points.push({
          activityId: params[0],
          seq: params[1],
          lat: params[2],
          lng: params[3],
          altitude: params[4],
          accuracy: params[5],
          speed: params[6],
          timestamp: params[7],
        });
        state.inserts += 1;
        return { lastInsertRowId: state.points.length, changes: 1 };
      }
      if (sql.toUpperCase().includes("DELETE FROM TRACK_POINTS")) {
        const before = state.points.length;
        state.points = state.points.filter(
          (p: (typeof state.points)[0]) => p.activityId !== params[0],
        );
        return { lastInsertRowId: 0, changes: before - state.points.length };
      }
      if (upper.includes("DELETE FROM ACTIVITIES")) {
        const had = state.activities.delete(String(params[0]));
        return { lastInsertRowId: 0, changes: had ? 1 : 0 };
      }
      throw new Error(`Mock sin soporte para: ${sql}`);
    },
    getFirstSync<T>(sql: string, params: any[]): T | null {
      const args = Array.isArray(params) ? params : [];
      const upper = sql.toUpperCase();
      if (upper.includes("PRAGMA USER_VERSION")) {
        return { user_version: state.version } as T;
      }
      if (upper.includes("SELECT * FROM ACTIVITIES WHERE ID")) {
        return (state.activities.get(String(args[0])) as T) ?? null;
      }
      if (upper.includes("SELECT MAX(SEQ)")) {
        const seqs = state.points
          .filter((p: (typeof state.points)[0]) => p.activityId === args[0])
          .map((p: (typeof state.points)[0]) => p.seq as number);
        return { maxSeq: seqs.length > 0 ? Math.max(...seqs) : null } as T;
      }
      if (upper.includes("SELECT COUNT(*)")) {
        return {
          n: state.points.filter(
            (p: (typeof state.points)[0]) => p.activityId === args[0],
          ).length,
        } as T;
      }
      throw new Error(`Mock sin soporte para: ${sql}`);
    },
    getAllSync<T>(sql: string, params: any[]): T[] {
      const args = Array.isArray(params) ? params : [];
      const upper = sql.toUpperCase();
      if (!upper.includes("FROM TRACK_POINTS")) {
        throw new Error(`Mock sin soporte para: ${sql}`);
      }
      const rows = state.points
        .filter((p: (typeof state.points)[0]) => p.activityId === args[0])
        .sort(
          (a: (typeof state.points)[0], b: (typeof state.points)[0]) =>
            (a.seq as number) - (b.seq as number),
        );
      if (sql.toUpperCase().includes("ORDER BY SEQ DESC")) {
        const limit = Number(args[1]);
        return rows.slice().reverse().slice(0, limit) as T[];
      }
      const limit = Number(args[1]);
      const offset = Number(args[2]);
      return rows.slice(offset, offset + limit) as T[];
    },
  };
}

function headerFixture(id = "act-1"): ActivityHeader {
  const now = 1720000000000;
  return {
    id,
    userId: "user-123",
    routeId: "route-1",
    routeTitle: "Ruta de prueba",
    origin: "free",
    status: "ready",
    startedAt: 1717000000000,
    finishedAt: null,
    distanceKm: 5,
    durationSec: 7200,
    synced: 0,
    createdAt: 1717000000000,
    updatedAt: 1717000000000,
  };
}

function pointFixture(i: number): NewTrackPoint {
  return {
    lat: -16.35 + i * 0.001,
    lng: -68.13 + i * 0.001,
    timestamp: 1717000000000 + i * 3000,
    accuracy: 8,
  };
}

async function runTrackDbTests(): Promise<TestResult[]> {
  recordTest(
    "ACTIVITY_CONFIG.MAX_ACCURACY_M es 25",
    ACTIVITY_CONFIG.MAX_ACCURACY_M === 25,
    `MAX_ACCURACY_M=${ACTIVITY_CONFIG.MAX_ACCURACY_M}`,
  );

  const db = createMemoryDb();

  migrateTrackDb(db);
  recordTest(
    "Migración crea el esquema (user_version 0 → 1)",
    getTrackDbVersion(db) === TRACK_DB_SCHEMA_VERSION,
    `version=${getTrackDbVersion(db)}`,
  );

  saveActivityHeader(db, headerFixture());
  migrateTrackDb(db);
  recordTest(
    "Migración idempotente: segunda pasada conserva versión y datos",
    getTrackDbVersion(db) === 1 &&
      getActivityHeader(db, "act-1")?.id === "act-1",
    `version=${getTrackDbVersion(db)}`,
  );

  const read = getActivityHeader(db, "act-1");
  recordTest(
    "Cabecera de actividad: roundtrip completo",
    read?.routeTitle === "Ruta de prueba",
    `title=${read?.routeTitle}`,
  );

  updateActivityHeader(db, "act-1", { status: "finished", synced: 1 });
  recordTest(
    "Actualización parcial de cabecera",
    getActivityHeader(db, "act-1")?.status === "finished",
    `status=${getActivityHeader(db, "act-1")?.status}`,
  );

  for (let i = 1; i <= 5; i++) {
    const next = getMaxSeq(db, "act-1") + 1;
    insertTrackPoint(db, "act-1", next, pointFixture(i));
  }
  recordTest(
    "Inserción secuencial con MAX(seq)+1 y conteo",
    countTrackPoints(db, "act-1") === 5 && getMaxSeq(db, "act-1") === 5,
    `pts=${countTrackPoints(db, "act-1")} max=${getMaxSeq(db, "act-1")}`,
  );

  const flaky = createMemoryDb(2);
  saveActivityHeader(flaky, headerFixture("act-backfill"));
  const legacyPoints = Array.from({ length: 5 }, (_, i) => pointFixture(i + 1));
  try {
    backfillTrackPoints(flaky, "act-backfill", legacyPoints, 1);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("interruption")) {
      throw error;
    }
  }
  const persistedBeforeRetry = getMaxSeq(flaky, "act-backfill");
  flaky.setFailureAfter(null);
  backfillTrackPoints(
    flaky,
    "act-backfill",
    legacyPoints.slice(persistedBeforeRetry),
    persistedBeforeRetry + 1,
  );
  recordTest(
    "Backfill legacy resumible tras interrupción sin saltar puntos",
    persistedBeforeRetry === 2 &&
      countTrackPoints(flaky, "act-backfill") === 5 &&
      getMaxSeq(flaky, "act-backfill") === 5,
    `beforeRetry=${persistedBeforeRetry} final=${getMaxSeq(flaky, "act-backfill")}`,
  );

  const last2 = getLastTrackPoints(db, "act-1", 2);
  recordTest(
    "Últimos N puntos en orden cronológico",
    last2.length === 2,
    `seqs=${last2.map((p) => p.seq).join(",")}`,
  );

  const page1 = getTrackPointsPage(db, "act-1", 2, 0);
  const page2 = getTrackPointsPage(db, "act-1", 2, 2);
  const page3 = getTrackPointsPage(db, "act-1", 2, 4);
  recordTest(
    "Paginación ordenada por seq sin solapes ni huecos",
    page1.map((p) => p.seq).join(",") === "1,2" &&
      page2.map((p) => p.seq).join(",") === "3,4" &&
      page3.map((p) => p.seq).join(",") === "5",
    `p1=${page1.map((p) => p.seq)} p2=${page2.map((p) => p.seq)} p3=${page3.map((p) => p.seq)}`,
  );

  let duplicateRejected = false;
  try {
    insertTrackPoint(db, "act-1", 3, pointFixture(99));
  } catch {
    duplicateRejected = true;
  }
  recordTest(
    "Constraint UNIQUE(activityId, seq) rechaza duplicados",
    duplicateRejected && countTrackPoints(db, "act-1") === 5,
    `rechazado=${duplicateRejected}`,
  );

  recordTest(
    "Actividad inexistente: header null, count 0, maxSeq 0",
    getActivityHeader(db, "nope") === null &&
      countTrackPoints(db, "nope") === 0 &&
      getMaxSeq(db, "nope") === 0,
    "valores por defecto correctos",
  );

  deleteActivity(db, "act-1");
  recordTest(
    "Eliminación borra cabecera y puntos",
    getActivityHeader(db, "act-1") === null &&
      countTrackPoints(db, "act-1") === 0,
    "cascada completa",
  );

  const nullable = getLastTrackPoints(db, "act-1", 1);
  void nullable;
  saveActivityHeader(db, headerFixture("act-2"));
  insertTrackPoint(db, "act-2", 1, {
    lat: -16.5,
    lng: -68.1,
    timestamp: 1720000000000,
  });
  const minimal = getLastTrackPoints(db, "act-2", 1)[0];
  recordTest(
    "Campos opcionales (altitude/accuracy/speed) admiten null",
    minimal.altitude === null &&
      minimal.accuracy === null &&
      minimal.speed === null,
    "nulls preservados",
  );

  return results;
}

if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("activity_track_db"))
) {
  console.log("\n============================================================");
  console.log("       TREKKIN APP — SUITE TRACK DB (ETAPA 1 SQLITE)        ");
  console.log("============================================================\n");

  runTrackDbTests()
    .then((allResults) => {
      let failedCount = 0;
      allResults.forEach((r) => {
        const statusIcon = r.passed ? "✓ PASS" : "✗ FAIL";
        console.log(`[${statusIcon}] [${r.id}] ${r.criterion}`);
        console.log(`        Detalle: ${r.detail}\n`);
        if (!r.passed) failedCount++;
      });

      console.log(
        "------------------------------------------------------------",
      );
      console.log(
        `Total Pruebas: ${allResults.length} | Aprobadas: ${allResults.length - failedCount} | Fallidas: ${failedCount}`,
      );
      console.log(
        "------------------------------------------------------------\n",
      );

      if (failedCount > 0) {
        process.exit(1);
      } else {
        console.log("🎉 SUITE TRACK DB PASÓ AL 100%.\n");
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Error fatal al ejecutar pruebas:", err);
      process.exit(1);
    });
}

export { runTrackDbTests };
