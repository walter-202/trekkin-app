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
  isResumableDownloadError,
  type OfflineDownloadStage,
  type OfflineRoute,
} from '../core/domain/offline';
import { EstimateRouteDownloadSizeUseCase } from '../core/application/offline/EstimateRouteDownloadSize.usecase';
import { CheckOfflineSpaceUseCase } from '../core/application/offline/CheckOfflineSpace.usecase';
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
  artifacts: {
    version: 1,
    gpx: { kind: 'gpx', version: 1, storagePath: 'routes/ruta-huayna-potosi/v1/route.gpx', fileName: 'route.gpx', mimeType: 'application/gpx+xml', byteSize: 128, status: 'uploaded', updatedAt: 1717000000000 },
    pmtiles: { kind: 'pmtiles', version: 1, storagePath: 'routes/ruta-huayna-potosi/v1/basemap.pmtiles', fileName: 'basemap.pmtiles', mimeType: 'application/vnd.pmtiles', byteSize: 64, status: 'uploaded', updatedAt: 1717000000000 },
  },
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
      downloadArtifact: async (id, kind) => {
        callLog.push(`${kind}:${id}`);
        return {
          tempPath: `${id}-${kind}.part`, finalPath: `${id}-${kind}`, byteSize: kind === 'pmtiles' ? 64 : 128,
          headerBytes: kind === 'pmtiles' ? 'PMTiles\u0003' : '<gpx',
          ...(kind === 'gpx' ? { readTrackPoints: async () => PUBLISHED_ROUTE.waypoints } : {}),
        };
      },
      cleanupArtifact: async (path) => { callLog.push(`cleanup:${path}`); },
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
      `pmtiles:${PUBLISHED_ROUTE.id},gpx:${PUBLISHED_ROUTE.id},finalize:${PUBLISHED_ROUTE.id}`,
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
        downloadArtifact: async () => ({ tempPath: 'x.part', finalPath: 'x', byteSize: 1, headerBytes: 'PMTiles\u0003' }),
        cleanupArtifact: async () => {},
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

  // =========================================================================
  // ESPACIO EN DISCO (gate previo a descargar)
  // =========================================================================
  const requiredBytes = estimate.totalBytes;
  const enough = await CheckOfflineSpaceUseCase(requiredBytes, {
    getFreeDiskBytes: async () => requiredBytes + 1024,
  });
  recordTest(
    'Espacio: con disco suficiente el veredicto es "enough"',
    enough.verdict === 'enough' && enough.freeBytes === requiredBytes + 1024,
    `libres=${enough.freeBytes}B requeridos=${enough.requiredBytes}B`,
  );

  const short = await CheckOfflineSpaceUseCase(requiredBytes, {
    getFreeDiskBytes: async () => 1,
  });
  recordTest(
    'Espacio: sin disco suficiente el veredicto es "insufficient"',
    short.verdict === 'insufficient' && short.freeBytes === 1,
    `libres=1B requeridos=${short.requiredBytes}B`,
  );

  const unknownThrow = await CheckOfflineSpaceUseCase(requiredBytes, {
    getFreeDiskBytes: async () => { throw new Error('no disponible'); },
  });
  const unknownNull = await CheckOfflineSpaceUseCase(requiredBytes, {
    getFreeDiskBytes: async () => null,
  });
  recordTest(
    'Espacio: si el dispositivo no informa, el veredicto es "unknown" (no bloquea)',
    unknownThrow.verdict === 'unknown' && unknownNull.verdict === 'unknown',
    'puerto que falla o null → unknown',
  );

  // =========================================================================
  // CORTE DE RED: auto-pausa conserva avance, corrupción limpia
  // =========================================================================
  recordTest(
    'Red: el clasificador distingue corte de red de error de integridad',
    isResumableDownloadError(new Error('Network request failed')) &&
      isResumableDownloadError({ code: 'storage/retry-limit-exceeded' }) &&
      isResumableDownloadError(new Error('Sin conexión a internet')) &&
      !isResumableDownloadError(new Error('El SHA-256 de gpx no coincide con el publicado.')) &&
      !isResumableDownloadError(new Error('El archivo gpx está vacío o incompleto.')),
    'red=true ×3, integridad=false ×2',
  );

  const okArtifact = (kind: 'pmtiles' | 'gpx') => ({
    tempPath: `${PUBLISHED_ROUTE.id}-${kind}.part`,
    finalPath: `${PUBLISHED_ROUTE.id}-${kind}`,
    byteSize: kind === 'pmtiles' ? 64 : 128,
    headerBytes: kind === 'pmtiles' ? 'PMTiles\u0003' : '<gpx',
    ...(kind === 'gpx' ? { readTrackPoints: async () => PUBLISHED_ROUTE.waypoints } : {}),
  });

  // Corte durante el GPX: no se limpia (se conserva lo verificado para reanudar).
  const keptLog: string[] = [];
  let networkError: unknown = null;
  try {
    await DownloadRouteOfflineUseCase(
      PUBLISHED_ROUTE,
      {
        downloadArtifact: async (id, kind) => {
          if (kind === 'gpx') throw new Error('Network request failed');
          return okArtifact(kind);
        },
        cleanupArtifact: async (path) => { keptLog.push(`cleanup:${path}`); },
        finalize: async () => {},
      },
      { downloadedAt: 1720000000000 },
    );
  } catch (err) {
    networkError = err;
  }
  recordTest(
    'Red: ante corte de red se conserva el avance (sin cleanup) y se propaga el error',
    networkError instanceof Error &&
      networkError.message === 'Network request failed' &&
      keptLog.length === 0,
    `error propagado, cleanups=${keptLog.length}`,
  );

  // Corrupción (tamaño distinto): se limpia para reintentar desde cero.
  const cleanedLog: string[] = [];
  let integrityError: unknown = null;
  try {
    await DownloadRouteOfflineUseCase(
      PUBLISHED_ROUTE,
      {
        downloadArtifact: async (id, kind) => {
          if (kind === 'gpx') return { ...okArtifact(kind), byteSize: 999 };
          return okArtifact(kind);
        },
        cleanupArtifact: async (path) => { cleanedLog.push(`cleanup:${path}`); },
        finalize: async () => {},
      },
      { downloadedAt: 1720000000000 },
    );
  } catch (err) {
    integrityError = err;
  }
  recordTest(
    'Integridad: ante tamaño corrupto se limpia todo y se informa el desajuste',
    integrityError instanceof Error &&
      String(integrityError.message).includes('no coincide') &&
      cleanedLog.length === 2,
    `cleanups=${cleanedLog.length}`,
  );

  // Reintento tras corte: re-solicita ambos artefactos (infra reutiliza el
  // verificado) y finaliza con manifiesto válido.
  const retryLog: string[] = [];
  let attempts = 0;
  const retried = await DownloadRouteOfflineUseCase(
    PUBLISHED_ROUTE,
    {
      downloadArtifact: async (id, kind) => {
        attempts += 1;
        retryLog.push(`${kind}:${id}`);
        if (attempts === 2) throw new Error('Network request failed');
        return okArtifact(kind);
      },
      cleanupArtifact: async () => {},
      finalize: async (id) => { retryLog.push(`finalize:${id}`); },
    },
    { downloadedAt: 1720000000000 },
  ).catch(() => null);
  recordTest(
    'Red: el primer intento cae en el GPX pero conserva el mapa verificado',
    retried === null && retryLog.join(',') === `pmtiles:${PUBLISHED_ROUTE.id},gpx:${PUBLISHED_ROUTE.id}`,
    retryLog.join(' → '),
  );

  const resumedLog: string[] = [];
  const resumed = await DownloadRouteOfflineUseCase(
    PUBLISHED_ROUTE,
    {
      downloadArtifact: async (id, kind) => {
        resumedLog.push(`${kind}:${id}`);
        return okArtifact(kind);
      },
      cleanupArtifact: async () => {},
      finalize: async (id) => { resumedLog.push(`finalize:${id}`); },
    },
    { downloadedAt: 1720000000000 },
  );
  recordTest(
    'Red: Reanudar completa la descarga y genera manifiesto válido',
    resumedLog.join(',') === `pmtiles:${PUBLISHED_ROUTE.id},gpx:${PUBLISHED_ROUTE.id},finalize:${PUBLISHED_ROUTE.id}` &&
      OfflineRouteSchema.safeParse(resumed).success,
    resumedLog.join(' → '),
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
