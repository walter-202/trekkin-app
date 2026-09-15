/**
 * Automated Acceptance Test Suite: HU-07 — Planificar Nueva Ruta
 * Clean Architecture - Pure Domain Schemas & Application Use Cases
 *
 * Scope:
 * - T1: SaveDraftSchema — título obligatorio, dificultad válida, coordenadas
 * - T2: Rechazo de borrador sin puntos
 * - T3: Rechazo de títulos vacíos o demasiado largos
 * - T4: SaveDraftUseCase — status draft, isPrivate, draftId
 * - T5: SetPlanPointsUseCase — coordenadas válidas
 * - T6: ConfirmStartPointUseCase — confirma punto de inicio real
 * - T7: MarkReadyForGpsUseCase — bandera de preparación GPS
 * - T8: Tile cache stats report 1500 max tiles
 * - T9: isDenied respects denied tiles
 */

import {
  SaveDraftSchema,
  SetPlanPointsSchema,
  ConfirmStartPointSchema,
  DifficultySchema,
  ROUTE_DIFFICULTY_VALUES,
} from '../core/domain/plan.schemas';
import type { RoutePlan, PlannedPoint } from '../core/domain/plan';
import type { RouteModel } from '../core/domain/types';
import { SaveDraftUseCase, makeDraftId } from '../core/application/plan/SaveDraft.usecase';
import { SetPlanPointsUseCase } from '../core/application/plan/SetPlanPoints.usecase';
import { ConfirmStartPointUseCase } from '../core/application/plan/ConfirmStartPoint.usecase';
import { MarkReadyForGpsUseCase } from '../core/application/plan/MarkReadyForGps.usecase';
import { tileCache } from '../infrastructure/persistence/tileCache';

interface TestResult {
  id: string;
  hu: 'HU-07';
  criterion: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function recordTest(criterion: string, passed: boolean, detail: string) {
  results.push({
    id: `HU-07-${results.length + 1}`,
    hu: 'HU-07',
    criterion,
    passed,
    detail,
  });
}

function makePlan(overrides?: Partial<RoutePlan>): RoutePlan {
  return {
    id: 'test-plan-001',
    creatorId: 'uid-tester',
    creatorName: 'Tester',
    title: 'Ruta de Prueba',
    status: 'planning',
    startPoint: { lat: -16.5, lng: -68.1, name: 'Inicio' },
    endPoint: { lat: -16.4, lng: -67.9, name: 'Destino' },
    waypoints: [],
    difficulty: 'moderado',
    startPointConfirmed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

const noopSaveLocal = async (_plan: RoutePlan): Promise<void> => {};
const noopSaveDraft = async (_route: RouteModel): Promise<void> => {};
const noopUpdateDraft = async (_id: string, _updates: Partial<RouteModel>): Promise<void> => {};

export async function runPlanAcceptanceTests(): Promise<TestResult[]> {
  // =========================================================================
  // T1: SaveDraftSchema — valid inputs accepted
  // =========================================================================
  const validDraft = {
    title: 'Camino del Inca',
    difficulty: 'dificil' as const,
    start: { lat: -16.5, lng: -68.1 },
    end: { lat: -16.4, lng: -67.9 },
  };
  const parsed = SaveDraftSchema.safeParse(validDraft);
  recordTest(
    'T1: SaveDraftSchema acepta entrada válida (título, dificultad, coordenadas)',
    parsed.success,
    parsed.success ? 'Schema validó exitosamente' : JSON.stringify(parsed),
  );

  // T1b: All difficulty values are accepted
  let allDiffOk = true;
  for (const d of ROUTE_DIFFICULTY_VALUES) {
    const r = DifficultySchema.safeParse(d);
    if (!r.success) allDiffOk = false;
  }
  recordTest(
    'T1: Todas las dificultades válidas son aceptadas (facil, moderado, dificil, experto)',
    allDiffOk,
    allDiffOk ? 'Las 4 dificultades pasan DifficultySchema' : 'Alguna dificultad falló',
  );

  // T1c: Invalid difficulty rejected
  const badDiff = DifficultySchema.safeParse('extremo');
  recordTest(
    'T1: Dificultad inválida es rechazada',
    !badDiff.success,
    !badDiff.success ? 'Dificultad "extremo" rechazada correctamente' : 'Debió rechazar',
  );

  // =========================================================================
  // T2: Rejection without start or end points
  // =========================================================================
  const planNoStart = makePlan({ startPoint: null });
  try {
    await SaveDraftUseCase(
      { plan: planNoStart },
      { saveDraft: noopSaveDraft, saveLocalPlan: noopSaveLocal },
    );
    recordTest('T2: Rechazo de borrador sin punto de inicio', false, 'No lanzó error');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    recordTest('T2: Rechazo de borrador sin punto de inicio', true, msg);
  }

  const planNoEnd = makePlan({ endPoint: null });
  try {
    await SaveDraftUseCase(
      { plan: planNoEnd },
      { saveDraft: noopSaveDraft, saveLocalPlan: noopSaveLocal },
    );
    recordTest('T2: Rechazo de borrador sin punto de destino', false, 'No lanzó error');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    recordTest('T2: Rechazo de borrador sin punto de destino', true, msg);
  }

  // =========================================================================
  // T3: Title validation
  // =========================================================================
  const emptyTitle = SaveDraftSchema.safeParse({ ...validDraft, title: '' });
  recordTest(
    'T3: Rechazo de título vacío',
    !emptyTitle.success,
    !emptyTitle.success ? 'Título vacío rechazado por Zod' : 'Debió rechazar',
  );

  const longTitle = SaveDraftSchema.safeParse({ ...validDraft, title: 'X'.repeat(201) });
  recordTest(
    'T3: Rechazo de título mayor a 200 caracteres',
    !longTitle.success,
    !longTitle.success ? 'Título de 201 chars rechazado' : 'Debió rechazar',
  );

  const maxTitle = SaveDraftSchema.safeParse({ ...validDraft, title: 'R'.repeat(200) });
  recordTest(
    'T3: Título de exactamente 200 caracteres es aceptado',
    maxTitle.success,
    maxTitle.success ? '200 chars aceptados' : 'Debió aceptar',
  );

  // =========================================================================
  // T4: SaveDraftUseCase — status, privacy, id
  // =========================================================================
  const capture: { route: RouteModel | null } = { route: null };
  const capturePorts = {
    saveDraft: async (route: RouteModel) => { capture.route = route; },
    saveLocalPlan: noopSaveLocal,
  };
  const planForSave = makePlan({ id: '' });
  const resultPlan = await SaveDraftUseCase({ plan: planForSave }, capturePorts);

  const idOk = resultPlan.id.startsWith('draft-');
  recordTest(
    'T4: SaveDraftUseCase genera draftId canónico con prefijo "draft-"',
    idOk,
    `ID generado: ${resultPlan.id}`,
  );

  const statusOk = capture.route !== null && capture.route.status === 'draft';
  recordTest(
    'T4: SaveDraftUseCase asigna status "draft"',
    statusOk,
    `status: ${capture.route?.status}`,
  );

  const privateOk = capture.route !== null && capture.route.isPrivate === true;
  recordTest(
    'T4: SaveDraftUseCase asigna isPrivate: true',
    privateOk,
    `isPrivate: ${capture.route?.isPrivate}`,
  );

  // =========================================================================
  // T5: SetPlanPointsUseCase — validates coordinates
  // =========================================================================
  const validPoints = SetPlanPointsSchema.safeParse({
    start: { lat: -16.5, lng: -68.1, name: 'A' },
    end: { lat: -16.4, lng: -67.9, name: 'B' },
  });
  recordTest(
    'T5: SetPlanPointsSchema acepta coordenadas válidas',
    validPoints.success,
    validPoints.success ? 'Inicio y destino validados' : 'Falló',
  );

  const invalidCoords = SetPlanPointsSchema.safeParse({
    start: { lat: -91, lng: -68 },
    end: { lat: -16, lng: -68 },
  });
  recordTest(
    'T5: SetPlanPointsSchema rechaza latitud fuera de rango',
    !invalidCoords.success,
    !invalidCoords.success ? 'Latitud -91 rechazada' : 'Debió rechazar',
  );

  // =========================================================================
  // T6: ConfirmStartPointUseCase — confirms real start point
  // =========================================================================
  const planForConfirm = makePlan({ startPointConfirmed: false });
  const gpsPoint: PlannedPoint = { lat: -16.501, lng: -68.102, name: 'GPS Real' };
  const confirmed = await ConfirmStartPointUseCase(
    { plan: planForConfirm, start: gpsPoint },
    { updateDraft: noopUpdateDraft, saveLocalPlan: noopSaveLocal },
  );
  recordTest(
    'T6: ConfirmStartPointUseCase marca startPointConfirmed = true',
    confirmed.startPointConfirmed === true,
    `startPointConfirmed: ${confirmed.startPointConfirmed}`,
  );
  recordTest(
    'T6: ConfirmStartPointUseCase actualiza las coordenadas del punto de inicio',
    confirmed.startPoint?.lat === gpsPoint.lat && confirmed.startPoint?.lng === gpsPoint.lng,
    `lat: ${confirmed.startPoint?.lat}, lng: ${confirmed.startPoint?.lng}`,
  );

  // =========================================================================
  // T7: MarkReadyForGpsUseCase — ready_for_gps transition
  // =========================================================================
  const readyPlan = makePlan({ startPointConfirmed: true });
  const markedReady = await MarkReadyForGpsUseCase(readyPlan, {
    updateDraft: noopUpdateDraft,
    saveLocalPlan: noopSaveLocal,
  });
  recordTest(
    'T7: MarkReadyForGpsUseCase cambia status a "ready_for_gps"',
    markedReady.status === 'ready_for_gps',
    `status: ${markedReady.status}`,
  );

  // T7b: Fails without confirmed start point
  const notConfirmedPlan = makePlan({ startPointConfirmed: false });
  try {
    await MarkReadyForGpsUseCase(notConfirmedPlan, {
      updateDraft: noopUpdateDraft,
      saveLocalPlan: noopSaveLocal,
    });
    recordTest('T7: Rechaza MarkReady sin punto de inicio confirmado', false, 'No lanzó error');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    recordTest('T7: Rechaza MarkReady sin punto de inicio confirmado', true, msg);
  }

  // =========================================================================
  // T8: Tile cache stats report MAX_TILES = 1500
  // =========================================================================
  const stats = tileCache.getStats();
  recordTest(
    'T8: Caché de teselas configurada a 1500 tiles máximo',
    stats.maxTiles === 1500,
    `maxTiles: ${stats.maxTiles}`,
  );

  // =========================================================================
  // T9: isDenied respects denied tiles
  // =========================================================================
  const wasDenied = tileCache.isDenied(99, 0, 0);
  recordTest(
    'T9: isDenied retorna false para tesela no denegada',
    wasDenied === false,
    `isDenied(99,0,0): ${wasDenied}`,
  );

  return results;
}

// If executed directly via `npx tsx src/tests/plan_hu7.test.ts`
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv.some((arg) => arg.includes('plan_hu7'))) {
  console.log('\n============================================================');
  console.log('       TREKKIN APP — SUITE DE ACEPTACIÓN HU-07 (PLAN)       ');
  console.log('============================================================\n');

  runPlanAcceptanceTests().then((allResults) => {
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
      console.log('🎉 TODAS LAS PRUEBAS DE ACEPTACIÓN HU-07 PASARON AL 100%.\n');
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Error fatal al ejecutar pruebas:', err);
    process.exit(1);
  });
}
