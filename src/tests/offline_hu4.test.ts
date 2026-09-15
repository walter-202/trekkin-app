/**
 * Automated Acceptance Test Suite: HU-04 (Descargar ruta offline)
 * Clean Architecture - Pure Domain & Application Use Cases
 *
 * Scope (criterios pegados T1–T12):
 * - C3/C4: tamaño estimado de la descarga (mapa + trazado + info).
 * - T6–T9: descarga de mapa vectorial, trazado e información básica.
 * - T10: progreso por etapas (map → trail → info).
 * - T12: listar y consultar rutas descargadas sin conexión.
 */

import type { RouteModel } from '../core/domain/types';
import { OfflineRouteSchema } from '../core/domain/offline.schemas';
import {
  DOWNLOAD_STAGES,
  formatBytes,
  type OfflineDownloadStage,
  type OfflineRoute,
} from '../core/domain/offline';
import { EstimateRouteDownloadSizeUseCase } from '../core/application/offline/EstimateRouteDownloadSize.usecase';
import { DownloadRouteOfflineUseCase } from '../core/application/offline/DownloadRouteOffline.usecase';
import { ListOfflineRoutesUseCase } from '../core/application/offline/ListOfflineRoutes.usecase';
import { GetOfflineRouteUseCase } from '../core/application/offline/GetOfflineRoute.usecase';

interface TestResult {
  id: string;
  hu: 'HU-04';
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `HU-04-${results.length + 1}`,
    hu: 'HU-04',
    criterion,
    passed,
    detail,
  });
}

const PUBLISHED_ROUTE: RouteModel = {
  id: 'ruta-huayna-potosi',
  title: 'Huayna Potosí — Refugio',
  description: 'Ruta de aproximación al refugio Casa Blanca.',
  region: 'Cordillera Real · El Alto',
  startPoint: { name: 'Paso Zongo', lat: -16.25, lng: -68.13 },
  endPoint: { name: 'Refugio Casa Blanca', lat: -16.265, lng: -68.145 },
  distanceKm: 6.8,
  durationMinutes: 240,
  elevationGainM: 620,
  difficulty: 'moderado',
  modality: 'acompañado',
  status: 'published',
  isPrivate: false,
  creatorId: 'guia-demo',
  creatorName: 'Club Andino',
  waypoints: [
    { lat: -16.25, lng: -68.13 },
    { lat: -16.258, lng: -68.138 },
    { lat: -16.265, lng: -68.145 },
  ],
  checkpoints: [
    {
      id: 'cp-descanso',
      name: 'Descanso Piedra Grande',
      category: 'descanso',
      lat: -16.258,
      lng: -68.138,
      createdAt: 1717000000000,
    },
  ],
  photos: [],
  createdAt: 1717000000000,
  updatedAt: 1717000000000,
};

export async function runOfflineAcceptanceTests(): Promise<TestResult[]> {
  // =========================================================================
  // C3/C4: TAMAÑO ESTIMADO
  // =========================================================================
  const estimate = EstimateRouteDownloadSizeUseCase(PUBLISHED_ROUTE);
  const partsSum = estimate.mapBytes + estimate.trailBytes + estimate.infoBytes;
  recordTest(
    'C3/C4: El tamaño estimado desglosa mapa + trazado + info y la suma es el total',
    partsSum === estimate.totalBytes && estimate.totalBytes > 0,
    `mapa=${estimate.mapBytes}B, trazado=${estimate.trailBytes}B, info=${estimate.infoBytes}B, total=${estimate.totalBytes}B`,
  );

  const estimate2 = EstimateRouteDownloadSizeUseCase(PUBLISHED_ROUTE);
  recordTest(
    'C3: El cálculo de tamaño estimado es determinista',
    estimate2.mapBytes === estimate.mapBytes &&
      estimate2.trailBytes === estimate.trailBytes &&
      estimate2.infoBytes === estimate.infoBytes,
    `Primer total=${estimate.totalBytes}B, segundo=${estimate2.totalBytes}B`,
  );

  recordTest(
    'C4: formatBytes muestra KB/MB legible',
    formatBytes(estimate.totalBytes).includes('KB') &&
      formatBytes(5 * 1024 * 1024) === '5.0 MB',
    `total=${formatBytes(estimate.totalBytes)}, 5MB=${formatBytes(5 * 1024 * 1024)}`,
  );

  // =========================================================================
  // T6–T10: DESCARGA CON PROGRESO POR ETAPAS
  // =========================================================================
  const callLog: string[] = [];
  const stagesSeen: OfflineDownloadStage[] = [];

  const finalizedRecord = await DownloadRouteOfflineUseCase(
    PUBLISHED_ROUTE,
    {
      saveMap: async (id) => {
        callLog.push(`map:${id}`);
      },
      saveTrail: async (id) => {
        callLog.push(`trail:${id}`);
      },
      saveInfo: async (id) => {
        callLog.push(`info:${id}`);
      },
      finalize: async (id) => {
        callLog.push(`finalize:${id}`);
      },
    },
    {
      onStage: (s) => stagesSeen.push(s),
      downloadedAt: 1720000000000,
    },
  );

  recordTest(
    'T2/T5: La descarga exige confirmación vía puerto finalize (flujo completo)',
    callLog.join(',') ===
      `map:${PUBLISHED_ROUTE.id},trail:${PUBLISHED_ROUTE.id},info:${PUBLISHED_ROUTE.id},finalize:${PUBLISHED_ROUTE.id}`,
    callLog.join(' → '),
  );

  recordTest(
    'T10: Progreso en orden mapa → trazado → info',
    stagesSeen.join(',') === 'map,trail,info' &&
      stagesSeen.length === DOWNLOAD_STAGES.length,
    stagesSeen.join(' → '),
  );

  recordTest(
    'T6/T7/T8: El registro final contiene mapa, trazado e información básica',
    !!finalizedRecord &&
      finalizedRecord.map.trailPointCount === PUBLISHED_ROUTE.waypoints.length &&
      finalizedRecord.trail.length === PUBLISHED_ROUTE.waypoints.length &&
      finalizedRecord.checkpoints.length === PUBLISHED_ROUTE.checkpoints.length &&
      finalizedRecord.title === PUBLISHED_ROUTE.title &&
      finalizedRecord.distanceKm === PUBLISHED_ROUTE.distanceKm,
    `routeId=${finalizedRecord?.routeId}, trail=${finalizedRecord?.trail.length} pts, checkpoints=${finalizedRecord?.checkpoints.length}`,
  );

  recordTest(
    'T9: El registro persistido valida el esquema Zod',
    finalizedRecord ? OfflineRouteSchema.safeParse(finalizedRecord).success : false,
    finalizedRecord
      ? `estimatedSizeMB=${finalizedRecord.estimatedSizeMB}, downloadedAt=${finalizedRecord.downloadedAt}`
      : 'sin registro',
  );

  let rejected = false;
  try {
    await DownloadRouteOfflineUseCase(
      { ...PUBLISHED_ROUTE, status: 'draft' },
      {
        saveMap: async () => {},
        saveTrail: async () => {},
        saveInfo: async () => {},
        finalize: async () => {},
      },
    );
  } catch {
    rejected = true;
  }
  recordTest(
    'Invariante: solo rutas publicadas pueden descargarse',
    rejected,
    'ruta draft rechazada sin persistir',
  );

  // =========================================================================
  // T12: CONSULTA SIN CONEXIÓN (solo repositorio local)
  // =========================================================================
  const store = new Map<string, OfflineRoute>();
  if (finalizedRecord) store.set(finalizedRecord.routeId, finalizedRecord);

  const offlineAgain: OfflineRoute = {
    ...(finalizedRecord as OfflineRoute),
    routeId: 'ruta-valle-luna',
    title: 'Valle de la Luna — Circuito',
    downloadedAt: 1730000000000,
  };
  store.set(offlineAgain.routeId, offlineAgain);

  const listed = await ListOfflineRoutesUseCase({
    list: async () => Array.from(store.values()),
  });
  recordTest(
    'T12: Listar rutas descargadas ordenadas por fecha (más reciente primero)',
    listed.length === 2 && listed[0].routeId === 'ruta-valle-luna',
    `orden: ${listed.map((r) => r.routeId).join(' > ')}`,
  );

  const one = await GetOfflineRouteUseCase(offlineAgain.routeId, {
    get: async (id) => store.get(id) ?? null,
  });
  recordTest(
    'T12: Obtener una ruta descargada y consultar su detalle sin red',
    one.title === 'Valle de la Luna — Circuito' &&
      one.distanceKm === offlineAgain.distanceKm,
    `detalle offline: ${one.title}`,
  );

  let missingThrows = false;
  try {
    await GetOfflineRouteUseCase('ruta-no-descargada', {
      get: async () => null,
    });
  } catch {
    missingThrows = true;
  }
  recordTest(
    'T12: Ruta no descargada informa error claro',
    missingThrows,
    'lanzó "aún no está descargada"',
  );

  return results;
}

// If executed directly via `npx tsx src/tests/offline_hu4.test.ts`
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.some((arg) => arg.includes('offline_hu4'))) {
  console.log('\n============================================================');
  console.log('       TREKKIN APP — SUITE DE ACEPTACIÓN HU-04 (OFFLINE)     ');
  console.log('============================================================\n');

  runOfflineAcceptanceTests().then((allResults) => {
    let failedCount = 0;
    allResults.forEach((r) => {
      const statusIcon = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`[${statusIcon}] [${r.hu}] ${r.criterion}`);
      console.log(`        Detalle: ${r.detail}\n`);
      if (!r.passed) failedCount++;
    });

    console.log('------------------------------------------------------------');
    console.log(`Total Pruebas: ${allResults.length} | Aprobadas: ${allResults.length - failedCount} | Fallidas: ${failedCount}`);
    console.log('------------------------------------------------------------\n');

    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log('🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-04 PASARON AL 100%.\n');
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Error fatal al ejecutar pruebas:', err);
    process.exit(1);
  });
}