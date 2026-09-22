import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync("storage.rules", "utf8");
assert.match(rules, /routeDoc\(routeId\)\.data\.status == 'published'/);
assert.match(rules, /routeDoc\(routeId\)\.data\.isPrivate != true/);
assert.match(rules, /routeDoc\(routeId\)\.data\.creatorId == request\.auth\.uid/);
assert.match(rules, /allow create, update: if validRouteArtifactWrite/);
assert.match(rules, /allow delete: if isAdmin\(\).*version\.matches/);
const deleteRule = rules.match(/allow delete: if isAdmin\(\)[^;]+;/)?.[0] ?? "";
assert.doesNotMatch(deleteRule, /request\.resource/);
assert.match(rules, /request\.resource\.contentType == 'application\/gpx\+xml'/);
assert.match(rules, /request\.resource\.contentType == 'application\/vnd\.pmtiles'/);
assert.match(rules, /request\.resource\.size > 0/);
console.log("Storage route bundle rules: published/private read and safe admin write/delete contract passed");
