import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { FEEDS, START_MS, STEP_MS, STEPS, COMMON_FIELDS, TRAILING_FIELDS, ELEVATION_CONTROLS,
  buildFeed, toCsv, projectPoint, elevationAt, generateFiles } from "./generate_feeds.mjs";

test("preserves the proven vertical feed's first five fields and Web Mercator units", () => {
  const vertical = readFileSync(new URL("../velocity_noise_feed.csv", import.meta.url), "utf8").split("\n")[0];
  assert.deepEqual(COMMON_FIELDS.slice(0, 5), vertical.split(",").slice(0, 5));
  assert.deepEqual(projectPoint(0, 0), { x: 0, y: 0 });
});

for (const feed of FEEDS) {
  test(`${feed.name}: complete, deterministic, timestamp/track-sorted CSV with valid schema`, () => {
    const built = buildFeed(feed);
    assert.deepEqual(built, buildFeed(feed));
    assert.equal(built.rows.length, STEPS * feed.sensors.length);
    assert.deepEqual(built.fields, [...COMMON_FIELDS, ...Object.keys(feed.fieldTypes), ...TRAILING_FIELDS]);
    const tracks = new Map();
    let previous = null;
    for (const row of built.rows) {
      assert.deepEqual(Object.keys(row), built.fields);
      assert.ok(row.Longitude > 11562500 && row.Longitude < 11565000);
      assert.ok(row.Latitude > 143200 && row.Latitude < 144600);
      assert.ok(row.Chainage_m >= 0 && row.Chainage_m <= 1537.6);
      assert.equal(row.IsSimulated, 1);
      assert.equal(row.Quality, "Good");
      assert.equal(row.ScenarioTimestamp, row.Timestamp);
      assert.equal((row.Timestamp - START_MS) % STEP_MS, 0);
      if (previous) assert.ok(row.Timestamp > previous.Timestamp || row.Timestamp === previous.Timestamp && row.TrackID > previous.TrackID);
      tracks.set(row.TrackID, (tracks.get(row.TrackID) ?? 0) + 1);
      for (const [field, type] of Object.entries(feed.fieldTypes)) {
        if (type === "String") assert.equal(typeof row[field], "string");
        else assert.ok(Number.isFinite(row[field]), field);
        if (type === "Int32") assert.ok(Number.isInteger(row[field]), field);
      }
      previous = row;
    }
    assert.equal(tracks.size, feed.sensors.length);
    assert.ok([...tracks.values()].every(count => count === STEPS));
    const csv = toCsv(built.fields, built.rows);
    assert.equal(csv.trimEnd().split("\n").length, built.rows.length + 1);
    assert.ok(Buffer.byteLength(csv) < 16 * 1024 * 1024);
    assert.ok(!csv.includes("undefined") && !csv.includes("NaN"));
  });
}

test("traffic slows as the queue grows, and reports nonnegative integer vehicle counts", () => {
  const { rows } = buildFeed(FEEDS.find(feed => feed.name === "traffic"));
  assert.ok(rows.some(row => row.TrafficState === "Queueing"));
  assert.ok(rows.some(row => row.TrafficState === "Free_Flow"));
  for (const row of rows) {
    assert.ok(row.QueueLength_m >= 0 && row.MeanSpeed_kmh >= 0);
    assert.ok(row.VehicleCount_1min >= 0 && Number.isInteger(row.VehicleCount_1min));
    if (row.QueueLength_m >= 120) assert.ok(row.MeanSpeed_kmh < 20);
  }
});

test("seven roadway-only feeds have globally distinct sensor and track identifiers", () => {
  assert.equal(FEEDS.length, 7);
  const sensors = FEEDS.flatMap(feed => feed.sensors);
  assert.equal(new Set(sensors.map(sensor => sensor.id)).size, 14);
  assert.equal(new Set(sensors.map(sensor => sensor.track)).size, 14);
  assert.ok(sensors.every(sensor => sensor.id.startsWith("LIN-")));
});

test("settlement and concrete time history preserve their physical relationships", () => {
  const movements = new Map();
  for (const row of buildFeed(FEEDS.find(feed => feed.name === "settlement")).rows) {
    const previous = movements.get(row.SensorID);
    assert.ok(row.SettlementRate_mm_h >= 0);
    if (previous !== undefined) assert.ok(row.Settlement_mm >= previous);
    movements.set(row.SensorID, row.Settlement_mm);
  }
  for (const row of buildFeed(FEEDS.find(feed => feed.name === "concrete")).rows) {
    assert.ok(Math.abs(row.TempDifference_C - Math.abs(row.CoreTemp_C - row.SurfaceTemp_C)) < 0.011);
    assert.ok(row.CoreTemp_C >= 25 && row.CoreTemp_C <= 70);
    assert.ok(row.AgeHours >= 4);
    assert.ok(!("Strength_MPa" in row));
  }
});

test("vibration reports the maximum of its three axes, never a waveform or invented noise value", () => {
  for (const row of buildFeed(FEEDS.find(feed => feed.name === "vibration")).rows) {
    assert.equal(row.PPV_Max_mm_s, Math.max(row.PPV_X_mm_s, row.PPV_Y_mm_s, row.PPV_Z_mm_s));
    assert.equal(row.Window_s, 60);
    assert.ok(row.DominantFrequency_Hz > 0);
  }
});

test("paving tracks move along their work sections and flag idle compaction data", () => {
  const feed = FEEDS.find(candidate => candidate.name === "paving");
  const observed = new Map();
  const states = new Set();
  for (const row of buildFeed(feed).rows) {
    const sensor = feed.sensors.find(candidate => candidate.id === row.SensorID);
    assert.ok(row.Chainage_m >= sensor.chainage && row.Chainage_m <= sensor.chainage + 176);
    assert.ok(row.PassCount >= 0 && row.PassCount <= 8);
    if (!row.CompactionValid) {
      assert.equal(row.RollerCMV, 0);
      assert.equal(row.RollerSpeed_kmh, 0);
    } else {
      assert.ok(row.SurfaceTemp_C > 100 && row.SurfaceTemp_C < 170);
      assert.ok(row.RollerCMV > 0);
    }
    if (!observed.has(row.TrackID)) observed.set(row.TrackID, new Set());
    observed.get(row.TrackID).add(row.Longitude);
    states.add(row.OperatingState);
  }
  assert.ok([...observed.values()].every(positions => positions.size > 3));
  assert.deepEqual([...states].sort(), ["Compacting", "Idle", "Weather_Hold"]);
});

test("water observations preserve units and plausible bounded example values", () => {
  for (const row of buildFeed(FEEDS.find(feed => feed.name === "runoff")).rows) {
    assert.ok(row.pH >= 0 && row.pH <= 14);
    assert.ok(row.Turbidity_NTU >= 0 && row.WaterDepth_m >= 0 && row.Flow_L_s >= 0);
    assert.ok(!("TSS_mg_L" in row));
  }
  for (const row of buildFeed(FEEDS.find(feed => feed.name === "groundwater")).rows) assert.ok(row.PorePressure_kPa > 0 && row.TipDepth_m > 0);
});

test("deck feeds carry checked IFC-derived Z, with changing roller elevations and probes inside slabs", () => {
  assert.equal(ELEVATION_CONTROLS.samples.length, 12);
  assert.match(ELEVATION_CONTROLS.sourceSha256, /^[a-f0-9]{64}$/);
  for (const feed of FEEDS) {
    const built = buildFeed(feed);
    const elevated = ["concrete", "paving"].includes(feed.name);
    assert.equal(built.fields.includes("Elevation_m"), elevated);
    if (!elevated) continue;
    const levels = new Map();
    for (const row of built.rows) {
      const sample = ELEVATION_CONTROLS.samples.find(candidate => candidate.SensorID === row.SensorID &&
        candidate.Longitude === row.Longitude && candidate.Latitude === row.Latitude);
      assert.ok(sample, `${row.SensorID}: no sampled IFC surface`);
      assert.equal(row.Elevation_m, sample.Elevation_m);
      assert.ok(row.Elevation_m > 0 && row.Elevation_m < 40);
      if (feed.name === "paving") {
        assert.equal(sample.IfcType, "IfcCourse");
        assert.ok(Math.abs(row.Elevation_m - sample.SurfaceTop_m - 2) < 0.001);
      } else {
        assert.equal(sample.IfcType, "IfcSlab");
        assert.ok(row.Elevation_m > sample.SurfaceBottom_m && row.Elevation_m < sample.SurfaceTop_m);
      }
      if (!levels.has(row.SensorID)) levels.set(row.SensorID, new Set());
      levels.get(row.SensorID).add(row.Elevation_m);
    }
    assert.ok([...levels.values()].every(values => feed.name === "paving" ? values.size === 5 : values.size === 1));
  }
  assert.throws(() => elevationAt("paving", "LIN-ROLLER-W01", 0, 0), /No verified IFC elevation/);
});

test("intentional regeneration checks the previous manifest before replacing any CSV", context => {
  const outputDirectory = mkdtempSync(join(tmpdir(), "roadway-elevation-test-"));
  context.after(() => rmSync(outputDirectory, { recursive: true, force: true }));
  generateFiles({ outputDirectory });
  const csvPath = join(outputDirectory, "velocity_linear_paving_feed.csv");
  const manifestPath = join(outputDirectory, "feed-manifest.json");
  const original = readFileSync(csvPath, "utf8");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.feeds.find(feed => feed.filename.includes("paving")).zField, "Elevation_m");
  assert.equal(manifest.feeds.find(feed => feed.filename.includes("traffic")).zField, null);
  const previousVersion = original.replace(",Elevation_m,", ",PreviousElevation_m,");
  writeFileSync(csvPath, previousVersion);
  manifest.feeds.find(feed => feed.filename.includes("paving")).sha256 = createHash("sha256").update(previousVersion).digest("hex");
  writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(() => generateFiles({ outputDirectory }), /Refusing to overwrite/);
  generateFiles({ outputDirectory, update: true });
  assert.equal(readFileSync(csvPath, "utf8"), original);
  writeFileSync(csvPath, original + "unexpected edit\n");
  assert.throws(() => generateFiles({ outputDirectory, update: true }), /fails its saved hash/);
});
