/// <reference types="node" />
import assert from 'node:assert/strict';
import type { RouteModel, TrekkinActivity } from '../core/domain/types';
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
mock('react-native', { Alert: { alert: () => {} } });
let routeFromServer: unknown = null;
let catalogFromServer: RouteModel[] = [];
mock('../infrastructure/database/routeService', {
  routeService: {
    getRoute: async () => routeFromServer as RouteModel | null,
    listPublishedRoutes: async () => catalogFromServer,
  },
});
mock('../infrastructure/database/activityService', { activityService: {
  createActivity: () => new Promise(() => {}),
  listUserActivities: async () => { throw new Error('Offline'); },
} });
mock('../infrastructure/location/locationService', {
  locationService: {
    stopWatching: () => {},
    startWatching: async () => null,
  },
  isAcceptableGpsAccuracy: () => true,
});
const { useActivityStore } = require('../infrastructure/persistence/useActivityStore') as
  typeof import('../infrastructure/persistence/useActivityStore');

async function main() {
  const store = useActivityStore;
  const routeId = 'route-partial';
  const points = [
    { lat: -16.5, lng: -68.1 },
    { lat: -16.505, lng: -68.105 },
    { lat: -16.51, lng: -68.11 },
  ];
  const cachedRoute: RouteModel = {
    id: routeId,
    title: 'Ruta preservada',
    description: 'Cache local',
    region: 'La Paz',
    startPoint: { name: 'Inicio', lat: points[0].lat, lng: points[0].lng },
    endPoint: { name: 'Fin', lat: points[2].lat, lng: points[2].lng },
    distanceKm: 2,
    durationMinutes: 60,
    difficulty: 'facil',
    modality: 'solo',
    status: 'published',
    isPrivate: false,
    creatorId: 'owner',
    creatorName: 'Hiker',
    waypoints: points,
    checkpoints: [],
    photos: [],
    createdAt: 1,
    updatedAt: 1,
  };
  const historyActivity: TrekkinActivity = {
    id: 'activity-1',
    userId: 'owner',
    userName: 'Hiker',
    routeId,
    routeTitle: cachedRoute.title,
    status: 'completed',
    startedAt: 1,
    finishedAt: 2,
    distanceCoveredKm: 2,
    remainingDistanceKm: 0,
    durationSeconds: 3600,
    recordedPoints: points,
    completedCheckpoints: [],
    isSynced: true,
    createdAt: 1,
  };
  routeFromServer = { isPrivate: false, status: 'published', updatedAt: 2 };
  catalogFromServer = [{ id: routeId, status: 'published', updatedAt: 2 } as RouteModel];
  store.setState({ catalogRoutes: [cachedRoute], lastResult: historyActivity });
  await store.getState().loadCatalog();
  assert.deepEqual(store.getState().catalogRoutes[0].waypoints, points, 'Catalog refreshes must preserve local geometry');

  const started = await store.getState().startRoute('owner', 'Hiker', routeId);
  assert.equal(started, true, 'A metadata-only route response must merge with local geometry');
  assert.deepEqual(store.getState().live!.route.waypoints, points);
  assert.deepEqual(store.getState().live!.route.startPoint, cachedRoute.startPoint);
  assert.deepEqual(store.getState().live!.route.endPoint, cachedRoute.endPoint);
  assert.deepEqual(store.getState().lastResult!.recordedPoints, points);
  store.setState({
    live: { ...store.getState().live!, recordedPoints: [points[0]] },
  });

  store.getState().mergeCatalogRoute({ id: routeId, status: 'published', updatedAt: 3 });
  const mergedRoute = store.getState().catalogRoutes[0];
  assert.deepEqual(mergedRoute.waypoints, points, 'Metadata updates must not replace waypoints');
  assert.deepEqual(mergedRoute.startPoint, cachedRoute.startPoint);
  assert.deepEqual(mergedRoute.endPoint, cachedRoute.endPoint);
  assert.deepEqual(store.getState().live!.route.waypoints, points);
  assert.deepEqual(store.getState().live!.recordedPoints, [points[0]]);
  await store.getState().clearLive();

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
