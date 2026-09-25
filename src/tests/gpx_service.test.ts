import assert from "node:assert/strict";

const fileSystemMock = {
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///docs/",
  EncodingType: { UTF8: "utf8" },
  makeDirectoryAsync: async () => {},
  writeAsStringAsync: async () => {},
};

const sharingMock = {
  isAvailableAsync: async () => true,
  shareAsync: async () => {},
};

const originalCache = (require as any).cache;
const mock = (moduleName: string, exports: unknown) => {
  require.cache[require.resolve(moduleName)] = { exports } as NodeJS.Module;
};

mock("expo-file-system/legacy", fileSystemMock);
mock("expo-sharing", sharingMock);

const { buildGpxXmlString } = require("../infrastructure/share/gpxService") as typeof import("../infrastructure/share/gpxService");

const points = [
  { lat: -16.5, lng: -68.1, altitude: 4000, timestamp: 1_700_000_000_000 },
  { lat: -16.51, lng: -68.11, altitude: 4100, timestamp: 1_700_000_010_000 },
];

const xml = buildGpxXmlString(
  "Ruta de prueba",
  "Recorrido de validación GPX",
  points,
);

assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(xml, /<gpx version="1\.1"/i);
assert.match(xml, /<trkpt lat="-16\.5" lon="-68\.1">/);
assert.match(xml, /<ele>4000<\/ele>/);
assert.match(xml, /<time>2023-11-14T22:13:20\.000Z<\/time>/);

console.log("GPX service: canonical XML serialization and point export passed");
