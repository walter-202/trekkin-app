import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync("firestore.rules", "utf8");
const previewRule = rules.match(/function isValidRoutePreview\(data\) \{([\s\S]*?)\n    \}/)?.[1];

assert.ok(previewRule, "Firestore rules must define a bounded route preview contract");
assert.match(previewRule, /data\.version is int && data\.version == 1/);
assert.match(previewRule, /data\.encoding == 'polyline6'/);
assert.match(previewRule, /data\.polyline\.size\(\) <= 4096/);
assert.match(previewRule, /data\.pointCount >= 2 && data\.pointCount <= 200/);
assert.match(previewRule, /data\.bbox\.minLng <= data\.bbox\.maxLng/);
assert.match(previewRule, /data\.bbox\.minLat <= data\.bbox\.maxLat/);
assert.match(rules, /'preview' in data && isValidRoutePreview\(data\.preview\) && !\('waypoints' in data\)/);

console.log("Firestore published route rules: bounded preview required and public waypoints removed");
