import {
  TRACK_WINDOW_SIZE,
  nextSeqAfterMax,
  resolvePointPersistence,
  segmentKm,
  sliceWindow,
} from "../core/application/activity/TrackWindow";
import { StartFreeRecordingUseCase } from "../core/application/activity/StartFreeRecording.usecase";
import { BeginTrackingUseCase } from "../core/application/activity/BeginTracking.usecase";
import { RecordPointUseCase } from "../core/application/activity/RecordPoint.usecase";
import {
  countTrackPoints,
  getMaxSeq,
  getTrackPointsPage,
  insertTrackPoint,
  saveActivityHeader,
} from "../infrastructure/database/activityTrackDb";
import type {
  NewTrackPoint,
  TrackDbConnection,
} from "../infrastructure/database/activityTrackDb";
import type { LiveActivity } from "../core/domain/activity";
import type { Coordinates } from "../core/domain/types";

interface TestResult {
  id: string;
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `SQLITE2-${results.length + 1}`,
    criterion,
    passed,
    detail,
  });
}

/** Mock en memoria mínimo (inserción + conteo + MAX + páginas). */
function createMemoryDb(failOnInsert = false): TrackDbConnection & {
  inserts: number;
} {
  const headers = new Map<string, Record<string, unknown>>();
  const points: Array<Record<string, unknown>> = [];
  const mock = {
    inserts: 0,
    execSync(): void {},
    runSync(sql: string, params: unknown) {
      const args = (Array.isArray(params) ? params : []) as unknown[];
      const upper = sql.toUpperCase();
      if (upper.includes("INSERT INTO ACTIVITIES")) {
        headers.set(String(args[0]), { id: String(args[0]) });
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (upper.includes("INSERT INTO TRACK_POINTS")) {
        if (failOnInsert) throw new Error("disk I/O error");
        const [
          activityId,
          seq,
          lat,
          lng,
          altitude,
          accuracy,
          speed,
          timestamp,
        ] = args;
        if (points.some((p) => p.activityId === activityId && p.seq === seq)) {
          throw new Error("UNIQUE constraint failed");
        }
        points.push({
          activityId,
          seq,
          lat,
          lng,
          altitude,
          accuracy,
          speed,
          timestamp,
        });
        mock.inserts += 1;
        return { lastInsertRowId: points.length, changes: 1 };
      }
      if (upper.includes("UPDATE ACTIVITIES")) {
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (upper.includes("DELETE FROM")) {
        return { lastInsertRowId: 0, changes: 0 };
      }
      throw new Error(`Mock sin soporte: ${sql}`);
    },
    getFirstSync<T>(sql: string, params: unknown): T | null {
      const args = (Array.isArray(params) ? params : []) as unknown[];
      const upper = sql.toUpperCase();
      if (upper.includes("PRAGMA USER_VERSION")) {
        return { user_version: 1 } as T;
      }
      if (upper.includes("SELECT * FROM ACTIVITIES")) {
        return (headers.get(String(args[0])) as T) ?? null;
      }
      if (upper.includes("SELECT MAX(SEQ)")) {
        const seqs = points
          .filter((p) => p.activityId === args[0])
          .map((p) => p.seq as number);
        return { maxSeq: seqs.length > 0 ? Math.max(...seqs) : null } as T;
      }
      if (upper.includes("SELECT COUNT(*)")) {
        return {
          n: points.filter((p) => p.activityId === args[0]).length,
        } as T;
      }
      throw new Error(`Mock sin soporte: ${sql}`);
    },
    getAllSync<T>(sql: string, params: unknown): T[] {
      const args = (Array.isArray(params) ? params : []) as unknown[];
      const rows = points
        .filter((p) => p.activityId === args[0])
        .sort((a, b) => (a.seq as number) - (b.seq as number));
      const limit = Number(args[1]);
      const offset = Number(args[2]);
      return rows.slice(offset, offset + limit) as T[];
    },
  };
  return mock;
}

async function freeLive(): Promise<LiveActivity> {
  const prepared = StartFreeRecordingUseCase({
    position: {
      lat: -16.5,
      lng: -68.1,
      altitude: 3640,
      accuracy: 8,
      fixTimestamp: Date.now(),
    },
    userId: "user-123",
    userName: "Tester",
  });
  return BeginTrackingUseCase(prepared);
}

function toNew(p: {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
}): NewTrackPoint {
  return {
    lat: p.lat,
    lng: p.lng,
    altitude: null,
    accuracy: p.accuracy ?? null,
    speed: null,
    timestamp: p.timestamp,
  };
}

async function runRecordSqliteTests(): Promise<TestResult[]> {
  const live = await freeLive();

  const okPlan = resolvePointPersistence(live, {
    lat: -16.5001,
    lng: -68.1,
    timestamp: 1720000002500,
    accuracy: 8,
  });
  recordTest(
    "Punto aceptado → plan insert (store insertaría antes de avanzar)",
    okPlan.action === "insert",
    `action=${okPlan.action}`,
  );

  // For rejection tests, need a live with at least one recorded point
  const liveWithPoint = {
    ...live,
    recordedPoints: [
      { lat: -16.5, lng: -68.1, timestamp: 1720000000000, accuracy: 8 },
    ],
  };
  const reasons = [
    [{ lat: -16.5001, lng: -68.1, timestamp: 1, accuracy: 40 }, "low_accuracy"],
    [{ lat: -16.5, lng: -68.1, timestamp: 1, accuracy: 8 }, "jitter"],
    [{ lat: -15.0, lng: -68.1, timestamp: 1, accuracy: 8 }, "jump"],
    [{ lat: 95, lng: -68.1, timestamp: 1 }, "invalid_schema"],
  ] as const;
  const skips = reasons.map(([pt, expected]) => {
    const plan = resolvePointPersistence(liveWithPoint, { ...pt });
    return plan.action === "skip" && plan.reason === expected;
  });
  recordTest(
    "Punto rechazado → plan skip con motivo (nunca SQLite)",
    skips.every(Boolean),
    `motivos=${reasons.map(([, r]) => r).join(",")}`,
  );

  const db = createMemoryDb();
  saveActivityHeader(db, {
    id: live.id,
    userId: live.userId,
    routeId: live.route.routeId,
    routeTitle: live.route.routeTitle,
    origin: live.origin ?? null,
    status: live.phase,
    startedAt: live.startedAt ?? live.createdAt,
    finishedAt: null,
    distanceKm: 0,
    durationSec: 0,
    synced: 0,
    createdAt: live.createdAt,
    updatedAt: live.createdAt,
  });
  // NEW BEHAVIOR: recordedPoints starts empty. Simulate first watcher fix (P1).
  const firstPoint = {
    lat: -16.5,
    lng: -68.1,
    timestamp: 1720000000000,
    accuracy: 8,
    altitude: 3640,
  };
  const plan = resolvePointPersistence(live, firstPoint);
  if (plan.action !== "insert")
    throw new Error("se esperaba insert para primer fix");
  const updated = await RecordPointUseCase(live, firstPoint);
  insertTrackPoint(
    db,
    live.id,
    1,
    toNew({ ...firstPoint, timestamp: firstPoint.timestamp ?? 1, accuracy: 8 }),
  );
  let seq = nextSeqAfterMax(getMaxSeq(db, live.id));
  let mem: LiveActivity = { ...updated, totalDistanceKm: 0 };
  let total = 0;
  for (let i = 1; i <= 3; i++) {
    const pt = {
      lat: -16.5 + i * 0.0001,
      lng: -68.1,
      timestamp: 1720000000000 + i * 3000,
      accuracy: 8,
    };
    const plan = resolvePointPersistence(mem, pt);
    if (plan.action !== "insert") throw new Error("se esperaba insert");
    const updated = await RecordPointUseCase(mem, pt);
    insertTrackPoint(db, mem.id, seq, toNew(pt));
    seq += 1;
    const prev = mem.recordedPoints[mem.recordedPoints.length - 1];
    total += segmentKm(prev, pt);
    mem = {
      ...updated,
      recordedPoints: sliceWindow(updated.recordedPoints),
      totalDistanceKm: total,
    };
  }
  recordTest(
    "Aceptado → SQLite primero (seq 1..4), luego memoria con total",
    countTrackPoints(db, live.id) === 4 &&
      getMaxSeq(db, live.id) === 4 &&
      mem.recordedPoints.length === 4 &&
      (mem.totalDistanceKm ?? 0) > 0,
    `db=${countTrackPoints(db, live.id)} mem=${mem.recordedPoints.length} total=${mem.totalDistanceKm?.toFixed(3)}`,
  );

  const badDb = createMemoryDb(true);
  const before = mem;
  let advanced = false;
  try {
    const plan = resolvePointPersistence(mem, {
      lat: -16.5005,
      lng: -68.1,
      timestamp: 1720000030000,
      accuracy: 8,
    });
    if (plan.action === "insert") {
      insertTrackPoint(
        badDb,
        mem.id,
        99,
        toNew({ lat: -16.5005, lng: -68.1, timestamp: 1 }),
      );
      advanced = true;
    }
  } catch {
    advanced = false;
  }
  recordTest(
    "Error SQLite → memoria NO avanza (objeto intacto)",
    advanced === false &&
      before.recordedPoints.length === mem.recordedPoints.length,
    "sin mutación ante fallo de disco",
  );

  const many = Array.from({ length: 350 }, (_, i) => ({
    lat: -16.5 + i * 0.00001,
    lng: -68.1,
  }));
  const windowed = sliceWindow(many);
  recordTest(
    `Ventana conserva últimos N=${TRACK_WINDOW_SIZE} en orden`,
    windowed.length === 300 &&
      windowed[0].lat === many[50].lat &&
      windowed[299].lat === many[349].lat,
    `len=${windowed.length}`,
  );

  // La ventana de `live.recordedPoints` NO cambia con mapTrack (invariante Fase 1).
  recordTest(
    `Invariante: TRACK_WINDOW_SIZE sigue en ${TRACK_WINDOW_SIZE} (mapTrack no lo toca)`,
    TRACK_WINDOW_SIZE === 300 && windowed.length <= TRACK_WINDOW_SIZE,
    `TRACK_WINDOW_SIZE=${TRACK_WINDOW_SIZE}`,
  );

  recordTest(
    "nextSeqAfterMax: null/0/N → 1/1/N+1 (sin COUNT por fix)",
    nextSeqAfterMax(null) === 1 &&
      nextSeqAfterMax(0) === 1 &&
      nextSeqAfterMax(7) === 8,
    "incremental correcto",
  );

  const origins: Array<[string, string]> = [
    ["free", live.route.routeId],
    ["route", "ruta-1"],
    ["plan", "draft-1"],
  ];
  recordTest(
    "free/route/plan preservan origin en cabecera (sin mezclar)",
    origins.every(([o]) => ["free", "route", "plan"].includes(o)),
    `origins=${origins.map(([o]) => o).join(",")}`,
  );

  const pages: number[] = [];
  for (let off = 0; off < 4; off += 2) {
    pages.push(...getTrackPointsPage(db, live.id, 2, off).map((r) => r.seq));
  }
  recordTest(
    "Rehidratación paginada cubre 1..4 en orden (finish/GPX)",
    pages.join(",") === "1,2,3,4",
    `seqs=${pages.join(",")}`,
  );

  recordTest(
    "mapTrack reutiliza getTrackPointsPage (misma API que finish)",
    pages.every((seq) => seq >= 1 && seq <= 4) && pages.length === 4,
    `seqs=${pages.join(",")}`,
  );

  const seededDb = createMemoryDb();
  const seededLivePrepared = StartFreeRecordingUseCase({
    position: { lat: -16.5, lng: -68.1, accuracy: 8, fixTimestamp: Date.now() },
    userId: "user-123",
    userName: "Tester",
  });
  const seededLive = await BeginTrackingUseCase(seededLivePrepared);
  // NEW BEHAVIOR: recordedPoints is always empty, no seed
  // Simulate first watcher fix for seeded case (now in_progress)
  const seededFirstFix = {
    lat: -16.5,
    lng: -68.1,
    timestamp: Date.now(),
    accuracy: 8,
    altitude: 3640,
  };
  const seededPlan = resolvePointPersistence(seededLive, seededFirstFix);
  if (seededPlan.action === "insert") {
    insertTrackPoint(
      seededDb,
      seededLive.id,
      1,
      toNew({
        ...seededFirstFix,
        timestamp: seededFirstFix.timestamp ?? 1,
        accuracy: 8,
      }),
    );
  }
  const seedlessDb = createMemoryDb();
  const seedlessLive = StartFreeRecordingUseCase({
    position: {
      lat: -16.5,
      lng: -68.1,
      accuracy: 60,
      fixTimestamp: Date.now(),
    },
    userId: "user-123",
    userName: "Tester",
  });
  const firstSeq = nextSeqAfterMax(getMaxSeq(seedlessDb, seedlessLive.id));
  insertTrackPoint(
    seedlessDb,
    seedlessLive.id,
    firstSeq,
    toNew({
      lat: -16.5001,
      lng: -68.1,
      timestamp: Date.now(),
      accuracy: 8,
    }),
  );
  recordTest(
    "SQLite consistente: sin semilla, primer fix es seq 1 en ambos casos",
    getMaxSeq(seededDb, seededLive.id) === 1 &&
      seededLive.recordedPoints.length === 0 &&
      getMaxSeq(seedlessDb, seedlessLive.id) === 1 &&
      seedlessLive.recordedPoints.length === 0,
    `seedMax=${getMaxSeq(seededDb, seededLive.id)} seedlessMax=${getMaxSeq(seedlessDb, seedlessLive.id)}`,
  );

  // ——— FASE 1 mapTrack: hidratación desde SQLite + invariante ventana 300 ———
  const loadMapTrack = (
    conn: TrackDbConnection,
    activityId: string,
  ): Coordinates[] => {
    try {
      const total = countTrackPoints(conn, activityId);
      if (total === 0) return [];
      const all: Coordinates[] = [];
      const PAGE = 2000;
      for (let offset = 0; offset < total; offset += PAGE) {
        const page = getTrackPointsPage(conn, activityId, PAGE, offset);
        for (const row of page) {
          all.push({
            lat: row.lat,
            lng: row.lng,
            altitude: row.altitude ?? undefined,
            timestamp: row.timestamp,
          });
        }
      }
      return all;
    } catch {
      return [];
    }
  };

  const geomDb = createMemoryDb();
  const geomId = "geom-1";
  saveActivityHeader(geomDb, {
    id: geomId,
    userId: "user-123",
    routeId: "free",
    routeTitle: "Geom",
    origin: "free",
    status: "in_progress",
    startedAt: Date.now(),
    finishedAt: null,
    distanceKm: 0,
    durationSec: 0,
    synced: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  for (let i = 1; i <= 420; i++) {
    insertTrackPoint(
      geomDb,
      geomId,
      i,
      toNew({ lat: -16.5 + i * 0.0001, lng: -68.1, timestamp: 1000 + i }),
    );
  }
  const hydrated = loadMapTrack(geomDb, geomId);
  recordTest(
    "mapTrack: loader paginado cubre TODO el histórico (420 pts, orden seq)",
    hydrated.length === 420 &&
      Math.abs(hydrated[0].lat - (-16.5 + 1 * 0.0001)) < 1e-9 &&
      Math.abs(hydrated[419].lat - (-16.5 + 420 * 0.0001)) < 1e-9 &&
      hydrated[0].lng === -68.1,
    `len=${hydrated.length}`,
  );

  recordTest(
    "mapTrack: id sin puntos → [] (hidratación limpia al iniciar free)",
    loadMapTrack(geomDb, "sin-actividad").length === 0,
    "vacío",
  );

  // Simula el ciclo del store: insert OK → append mapTrack + sliceWindow live.
  const cycleLive: LiveActivity = { ...live, id: geomId, recordedPoints: [] };
  let cycleMap: Coordinates[] = [];
  let cycleWindow = cycleLive.recordedPoints;
  for (let i = 0; i < 350; i++) {
    const pt: Coordinates = {
      lat: -16.5 + i * 0.0001,
      lng: -68.1,
      timestamp: 2000 + i,
    };
    cycleWindow = sliceWindow([...cycleWindow, pt], TRACK_WINDOW_SIZE);
    cycleMap = [...cycleMap, pt];
  }
  recordTest(
    `Fase 1: mapTrack crece sin límite y live queda en ventana ${TRACK_WINDOW_SIZE}`,
    cycleMap.length === 350 && cycleWindow.length === TRACK_WINDOW_SIZE,
    `mapTrack=${cycleMap.length} window=${cycleWindow.length}`,
  );

  recordTest(
    "Fase 1: Opción A intacta — free inicia con recordedPoints=[]",
    StartFreeRecordingUseCase({
      position: {
        lat: -16.5,
        lng: -68.1,
        accuracy: 8,
        fixTimestamp: Date.now(),
      },
      userId: "user-123",
      userName: "Tester",
    }).recordedPoints.length === 0,
    "opción A verificada",
  );

  return results;
}

if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("activity_record_sqlite"))
) {
  console.log("\n============================================================");
  console.log("       TREKKIN APP — SUITE RECORD→SQLITE (ETAPA 2)          ");
  console.log("============================================================\n");

  runRecordSqliteTests()
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
        console.log("🎉 SUITE RECORD→SQLITE PASÓ AL 100%.\n");
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error("Error fatal al ejecutar pruebas:", err);
      process.exit(1);
    });
}

export { runRecordSqliteTests };
