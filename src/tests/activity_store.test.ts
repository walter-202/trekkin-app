/// <reference types="node" />
import assert from 'node:assert/strict';
import type { TrekkinActivity } from '../core/domain/types';
import type { GpsPosition } from '../infrastructure/location/locationService';

const disk = new Map<string, string>();
let diskFull = false;
const storage = {
  getItem: async (key: string) => disk.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (diskFull) throw new Error('Disk full');
    disk.set(key, value);
  },
  removeItem: async (key: string) => { disk.delete(key); },
};
function mock(path: string, exports: unknown) {
  require.cache[require.resolve(path)] = { exports } as NodeJS.Module;
}
mock('@react-native-async-storage/async-storage', storage);
mock('../infrastructure/persistence/storage', { appStorage: storage });
mock('../infrastructure/database/routeService', { routeService: {} });
mock('../infrastructure/database/activityService', { activityService: {
  createActivity: () => new Promise(() => {}),
  listUserActivities: async () => { throw new Error('Offline'); },
} });
mock('../infrastructure/location/locationService', { locationService: {
  stopWatching: () => {}, startWatching: async () => null,
} });
const { useActivityStore } = require('../infrastructure/persistence/useActivityStore') as
  typeof import('../infrastructure/persistence/useActivityStore');

async function main() {
  const store = useActivityStore;
  await store.getState().startFreeRecording({ lat: 0, lng: 0 }, 'owner', 'Hiker');
  const now = Date.now();
  const point = (index: number): GpsPosition => ({
    latitude: index * 0.0001, longitude: 0, timestamp: now + index * 1000, accuracy: 5,
  });
  await Promise.all([1, 2, 3].map((i) => store.getState().recordPoint(point(i))));
  assert.equal(store.getState().live!.recordedPoints.length, 4, 'Concurrent callbacks must all survive');
  diskFull = true;
  await store.getState().recordPoint(point(4));
  assert.equal(store.getState().live!.recordedPoints.length, 4, 'Do not claim an unpersisted point');
  assert.match(store.getState().error!, /Disk full/);
  diskFull = false;
  await store.getState().recordPoint(point(4));
  assert.equal(store.getState().live!.recordedPoints.length, 5, 'Queue recovers after failure');
  let timeout: ReturnType<typeof setTimeout>;
  const result = await Promise.race([
    store.getState().finishActivity(),
    new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Finish waited for network')), 500); }),
  ]).finally(() => clearTimeout(timeout));
  assert.ok(result);
  assert.equal(result.saved.isSynced, false);
  assert.equal(result.saved.recordedPoints.length, 5);
  const archive = JSON.parse(disk.get('trekking_activity_unsynced')!) as TrekkinActivity[];
  assert.equal(archive[0].id, result.saved.id);
  await store.getState().clearLive();
  await store.getState().listActivities('owner');
  assert.equal(store.getState().activities.length, 1, 'History works without Firestore');
  await store.getState().listActivities('other');
  assert.equal(store.getState().activities.length, 0, 'Local history must be owner-scoped');
  assert.equal(await store.getState().loadActivity(result.saved.id, 'other'), null);
  console.log('Activity store: ordered capture, disk failure, offline finish/history and ownership passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
