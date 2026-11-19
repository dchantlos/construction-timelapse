import test from "node:test";
import assert from "node:assert/strict";
import { orbSymbol, labelSymbol, sensorPulseAt, SENSOR_GLOW_INTENSITY } from "../js/sensor-marker-style.mjs";
import { createInstrumentStore } from "../js/linear-instrument-store.mjs";

test("shared orbs and labels retain the vertical project's exact symbology", () => {
  const rgb = [74, 222, 128];
  assert.deepEqual(orbSymbol(rgb), { type: "point-3d", symbolLayers: [{ type: "object", resource: { primitive: "sphere" },
    material: { color: rgb, emissive: { strength: 2, source: "color" } }, anchor: "bottom", width: 6, depth: 6, height: 6 }] });
  const label = labelSymbol("Settlement - West\n6.0 mm", rgb);
  assert.equal(label.symbolLayers[0].text, "Settlement - West\n6.0 mm");
  assert.equal(label.symbolLayers[0].size, 11.5);
  assert.deepEqual(label.verticalOffset, { screenLength: 22, minWorldLength: 16 });
  assert.deepEqual(label.callout.color, [74, 222, 128, 0.85]);
  assert.equal(SENSOR_GLOW_INTENSITY, 0.7);
});

test("pulse matches the vertical 2.8-second period and respects reduced motion", () => {
  assert.deepEqual(sensorPulseAt(0), { orbs: 1, labels: 1, trough: false });
  assert.deepEqual(sensorPulseAt(1400), { orbs: 0.55, labels: 0.5, trough: true });
  assert.deepEqual(sensorPulseAt(2800), sensorPulseAt(0));
  assert.deepEqual(sensorPulseAt(1400, true), { orbs: 1, labels: 1, trough: false });
});

test("shared instrument store rejects out-of-order messages and honors paused versus stale readings", () => {
  let timestamp = Date.parse("2026-11-19T12:00:00Z");
  const store = createInstrumentStore({ now: () => timestamp });
  const feature = { attributes: { TrackID: "MBE-LIN-SET-W01", SensorID: "LIN-SET-W01", Timestamp: timestamp,
    Settlement_mm: 6, SettlementRate_mm_h: 0.05, Quality: "Good", IsSimulated: 1 },
    geometry: { x: 11563094.25, y: 143714.33, spatialReference: { wkid: 102100 } } };
  assert.equal(store.ingest("settlement", feature), true);
  assert.equal(store.ingest("settlement", { ...feature, attributes: { ...feature.attributes, Timestamp: timestamp - 1 } }), false);
  assert.equal(store.snapshot()[0].reading.color, "#4ade80");
  timestamp += 31000;
  assert.equal(store.snapshot()[0].reading.text, "--");
  assert.equal(store.snapshot({ paused: true })[0].reading.text, "6.00");
  store.clear();
  assert.equal(store.snapshot().length, 0);
});