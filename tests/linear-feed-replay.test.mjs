import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FEEDS, buildFeed } from "../docs/velocity/linear/generate_feeds.mjs";
import { compileReplayFeed, replayFeatures } from "../js/linear-feed-replay.mjs";
import { createReplaySource } from "../js/linear-feed-source.mjs";
import { describeInstrument } from "../js/linear-instrument-config.mjs";

const manifest = JSON.parse(readFileSync(new URL("../docs/velocity/linear/feed-manifest.json", import.meta.url), "utf8"));
const now = Date.parse("2026-11-19T07:00:00Z");
function source(name) {
  const definition = FEEDS.find(feed => feed.name === name);
  const descriptor = manifest.feeds.find(feed => feed.filename === `velocity_linear_${name}_feed.csv`);
  const built = buildFeed(definition);
  return { descriptor, rows: [built.fields, ...built.rows.map(row => built.fields.map(field => String(row[field])))], originals: built.rows };
}

test("replays all seven Velocity datasets with exact fields and fourteen stable tracks", () => {
  const tracks = new Set();
  for (const definition of FEEDS) {
    const { descriptor, rows, originals } = source(definition.name);
    const feed = compileReplayFeed(descriptor, rows);
    const messages = replayFeatures(feed, 0, now);
    assert.equal(messages.length, 2);
    assert.equal(feed.durationMs, 86400000);
    for (const feature of messages) {
      tracks.add(feature.attributes.TrackID);
      const original = originals.find(row => row.TrackID === feature.attributes.TrackID);
      assert.deepEqual(feature.attributes, { ...original, Timestamp: now });
      assert.equal(feature.attributes.IsSimulated, 1);
      assert.equal(feature.geometry.x, original.Longitude);
      assert.equal(feature.geometry.y, original.Latitude);
      assert.equal(feature.geometry.spatialReference.wkid, 102100);
      assert.equal("z" in feature.geometry, descriptor.zField !== null);
      if (descriptor.zField) assert.equal(feature.geometry.z, original.Elevation_m);
    }
  }
  assert.equal(tracks.size, 14);
});

test("advances and loops while remapping only the observation timestamp", () => {
  const { descriptor, rows } = source("settlement");
  const feed = compileReplayFeed(descriptor, rows);
  const first = replayFeatures(feed, 0, now);
  const next = replayFeatures(feed, 60000, now + 1000);
  const looped = replayFeatures(feed, feed.durationMs, now + 1440000);
  assert.equal(next[0].attributes.ScenarioTimestamp - first[0].attributes.ScenarioTimestamp, 60000);
  assert.notEqual(next[0].attributes.Settlement_mm, first[0].attributes.Settlement_mm);
  assert.equal(looped[0].attributes.ScenarioTimestamp, first[0].attributes.ScenarioTimestamp);
  assert.equal(looped[0].attributes.Timestamp, now + 1440000);
  first[0].attributes.Settlement_mm = -999;
  assert.notEqual(replayFeatures(feed, 0, now)[0].attributes.Settlement_mm, -999);
});

test("moving rollers retain the IFC-sampled absolute Z for each coordinate", () => {
  const { descriptor, rows } = source("paving");
  const feed = compileReplayFeed(descriptor, rows);
  const first = replayFeatures(feed, 0, now);
  const moved = replayFeatures(feed, 60000, now + 1000);
  for (const feature of moved) {
    const previous = first.find(candidate => candidate.attributes.TrackID === feature.attributes.TrackID);
    assert.notEqual(feature.geometry.x, previous.geometry.x);
    assert.notEqual(feature.geometry.z, previous.geometry.z);
    assert.equal(feature.geometry.z, feature.attributes.Elevation_m);
    assert.ok(feature.geometry.z > 15 && feature.geometry.z < 27);
  }
});

test("rejects incomplete, nonnumeric and wrong-track input rather than fabricating readings", () => {
  const { descriptor, rows } = source("settlement");
  assert.throws(() => compileReplayFeed(descriptor, rows.slice(0, -1)), /Incomplete replay/);
  const badValue = rows.map(row => [...row]);
  badValue[1][rows[0].indexOf("Settlement_mm")] = "";
  assert.throws(() => compileReplayFeed(descriptor, badValue), /Invalid Settlement_mm/);
  const badTrack = rows.map(row => [...row]);
  badTrack[1][rows[0].indexOf("TrackID")] = "wrong-track";
  assert.throws(() => compileReplayFeed(descriptor, badTrack), /Invalid simulated track/);
  const badSchema = rows.map(row => [...row]);
  badSchema[0][0] = "Time";
  assert.throws(() => compileReplayFeed(descriptor, badSchema), /Unexpected CSV schema/);
});

test("same feed interface supports pause, resume, speed changes, and restart without advancing while paused", async () => {
  let wall = now;
  let elapsed = 0;
  let tick;
  let resets = 0;
  let cancelled = false;
  const messages = new Map();
  const replay = createReplaySource({ now: () => wall, clock: () => elapsed,
    schedule: callback => { tick = callback; return 7; }, unschedule: id => { cancelled = id === 7; },
    onReset: () => { resets += 1; }, onFeature: (key, feature) => messages.set(feature.attributes.TrackID, feature),
    parseRows: name => source(name).rows,
    fetchImpl: async url => ({ ok: true, text: async () => String(url).endsWith("feed-manifest.json") ? JSON.stringify(manifest) :
      /velocity_linear_(\w+)_feed/.exec(String(url))[1] }) });
  await replay.start();
  assert.equal(messages.size, 14);
  const first = messages.get("MBE-LIN-SET-W01").attributes.ScenarioTimestamp;
  elapsed += 1000; wall += 1000; tick();
  assert.equal(messages.get("MBE-LIN-SET-W01").attributes.ScenarioTimestamp, first + 60000);
  replay.pause();
  const before = messages.get("MBE-LIN-SET-W01");
  elapsed += 5000; wall += 5000; tick();
  assert.equal(messages.get("MBE-LIN-SET-W01"), before);
  replay.resume();
  assert.equal(messages.get("MBE-LIN-SET-W01").attributes.ScenarioTimestamp, before.attributes.ScenarioTimestamp);
  replay.setSpeed(1);
  elapsed += 60000; wall += 60000; tick();
  assert.equal(messages.get("MBE-LIN-SET-W01").attributes.ScenarioTimestamp, first + 120000);
  replay.restart();
  assert.equal(resets, 1);
  assert.equal(messages.get("MBE-LIN-SET-W01").attributes.ScenarioTimestamp, first);
  replay.destroy();
  assert.equal(cancelled, true);
});

test("a failed instrument input does not stop the other feeds or turn failure into a valid reading", async () => {
  const tracks = new Set();
  const replay = createReplaySource({ now: () => now, clock: () => 0, schedule: () => 1, unschedule: () => {},
    onFeature: (key, feature) => tracks.add(feature.attributes.TrackID), parseRows: name => source(name).rows,
    fetchImpl: async url => String(url).includes("_runoff_") ? { ok: false, status: 503 } : { ok: true,
      text: async () => String(url).endsWith("feed-manifest.json") ? JSON.stringify(manifest) : /velocity_linear_(\w+)_feed/.exec(String(url))[1] } });
  await replay.start();
  assert.equal(tracks.size, 12);
  assert.equal(replay.snapshot().feeds.runoff, "unavailable");
  assert.equal(replay.snapshot().feeds.paving, "ready");
  assert.equal(describeInstrument("runoff", null).text, "--");
  assert.equal(describeInstrument("runoff", null).level, null);
  replay.destroy();
});

test("condition colors remain green-yellow-orange-red and inactive compaction is not graded", () => {
  const feature = value => ({ attributes: { Quality: "Good", IsSimulated: 1, Turbidity_NTU: value, RunoffState: "Runoff_Event" } });
  assert.deepEqual([12, 30, 80, 150].map(value => describeInstrument("runoff", feature(value)).color),
    ["#4ade80", "#facc15", "#fb923c", "#f87171"]);
  assert.equal(describeInstrument("runoff", feature(0)).text, "0.0");
  assert.equal(describeInstrument("runoff", feature(12), { stale: true }).color, "#94a3b8");
  assert.equal(describeInstrument("paving", { attributes: { Quality: "Good", SurfaceTemp_C: 30, CompactionValid: 0 } }).level, null);
});