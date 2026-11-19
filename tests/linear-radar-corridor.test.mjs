import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const corridor = JSON.parse(readFileSync(new URL("../docs/radar/roadway-corridor.geojson", import.meta.url), "utf8"));

test("radar project area is the georeferenced IFC roadway footprint", () => {
  assert.equal(corridor.type, "FeatureCollection");
  assert.equal(corridor.features.length, 1);
  const feature = corridor.features[0];
  assert.equal(feature.geometry.type, "Polygon");
  assert.equal(feature.geometry.coordinates.length, 1);
  const ring = feature.geometry.coordinates[0];
  assert.ok(ring.length > 700);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring.every(position => position.length === 2 && position.every(Number.isFinite)));
  assert.ok(ring.every(([longitude, latitude]) => longitude > 103.85 && longitude < 103.91 && latitude > 1.27 && latitude < 1.32));
  assert.equal(feature.properties.SourceIfcType, "IfcAlignment");
  assert.equal(feature.properties.GlobalId.length, 22);
  assert.match(feature.properties.SourceIFCSHA256, /^[a-f0-9]{64}$/);
  assert.equal(feature.properties.Width_m, 20);
  assert.ok(Math.abs(feature.properties.Length_m - 1537.597) < 0.01);
  assert.ok(Math.abs(feature.properties.Area_m2 / (feature.properties.Width_m * feature.properties.Length_m) - 1) < 0.02);
  assert.match(feature.properties.Description, /not a surveyed/);
});