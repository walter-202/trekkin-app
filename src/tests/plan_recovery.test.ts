/// <reference types="node" />
import assert from 'node:assert/strict';
import { InitializePlanUseCase } from '../core/application/plan/InitializePlan.usecase';
import { GetDraftUseCase } from '../core/application/plan/GetDraft.usecase';
import type { RoutePlan } from '../core/domain/plan';

async function main() {
  const plan: RoutePlan = {
    id: 'draft-1', creatorId: 'owner', creatorName: 'Hiker', title: 'Trail',
    status: 'ready_for_gps', startPoint: { lat: 0, lng: 0 }, endPoint: { lat: 1, lng: 1 },
    waypoints: [], difficulty: 'moderado', startPointConfirmed: true, createdAt: 1, updatedAt: 2,
  };
  assert.deepEqual(await InitializePlanUseCase({ uid: 'owner', creatorName: 'Hiker' }, {
    loadLocalPlan: async () => plan,
  }), plan, 'Ready plans must survive restart');
  assert.deepEqual(await GetDraftUseCase({ uid: 'owner', id: plan.id }, {
    loadLocalPlan: async () => plan,
    getDraft: async () => { throw new Error('Offline'); },
  }), plan, 'The owned local draft must open without network');
  await assert.rejects(GetDraftUseCase({ uid: 'other', id: plan.id }, {
    loadLocalPlan: async () => plan, getDraft: async () => null,
  }));
  console.log('Plan recovery: ready state, offline open and ownership passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
