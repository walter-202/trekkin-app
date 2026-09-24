import { ShareGpxFileUseCase } from '../core/application/share';
import { buildGPX11 } from '../core/domain/trackFormats';

function assert(condition: any, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}
assert.ok = (condition: any, message?: string) => assert(condition, message);
assert.equal = (actual: any, expected: any) => assert(actual === expected, `Expected ${actual} === ${expected}`);
assert.deepEqual = (actual: any, expected: any) =>
  assert(JSON.stringify(actual) === JSON.stringify(expected), `Expected deep equality`);
assert.rejects = async (promise: Promise<any>, expectedRegex?: RegExp) => {
  try {
    await promise;
    throw new Error('Expected promise to reject');
  } catch (err: any) {
    if (err.message === 'Expected promise to reject') throw err;
    if (expectedRegex) {
      assert(expectedRegex.test(err.message), `Expected ${err.message} to match ${expectedRegex}`);
    }
  }
};

async function main() {
  const calls: unknown[] = [];
  const file = { fileName: 'trekkin_test.gpx', content: '<gpx/>', mimeType: 'application/gpx+xml' };
  const ports = {
    isAvailable: async () => true,
    writeFile: async (name: string, content: string) => {
      calls.push([name, content]);
      return `file:///exports/${name}`;
    },
    shareFile: async (uri: string, mimeType: string) => { calls.push([uri, mimeType]); },
  };
  await ShareGpxFileUseCase(file, ports);
  assert.deepEqual(calls, [
    ['trekkin_test.gpx', '<gpx/>'],
    ['file:///exports/trekkin_test.gpx', 'application/gpx+xml'],
  ]);
  calls.length = 0;
  await assert.rejects(ShareGpxFileUseCase(file, { ...ports, isAvailable: async () => false }));
  assert.equal(calls.length, 0);
  await assert.rejects(ShareGpxFileUseCase(file, {
    ...ports, writeFile: async () => { throw new Error('Disk full'); },
  }), /Disk full/);
  assert.equal(calls.length, 0);
  const xml = buildGPX11({ name: 'A & B', points: [{ lat: 0, lng: 0, timestamp: 0 }],
    waypoints: [{ lat: 1, lng: 1, name: 'Summit', altitude: 123 }] });
  assert.ok(xml.includes('A &amp; B'));
  assert.ok(xml.includes('<time>1970-01-01T00:00:00.000Z</time>'));
  const waypoint = xml.slice(xml.indexOf('<wpt'), xml.indexOf('</wpt>'));
  assert.ok(waypoint.indexOf('<ele>') < waypoint.indexOf('<name>'));
  console.log('GPX delivery: 5 checks passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
