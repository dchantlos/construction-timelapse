// =============================================================================
// generate_feeds.mjs — build 24 h simulated ArcGIS Velocity feed CSVs for the
// Zürich construction site: noise (7 sensors), dust (2), and a multi-gas station.
//
// Output matches the proven AQI sample schema: the "Longitude"/"Latitude"
// columns carry Web Mercator Auxiliary Sphere X/Y in metres (WKID 102100 / 3857),
// NOT degrees. Elevation is handled with Scene Viewer offsets, so there is no z
// column. Timestamps span one representative weekday, local midnight → midnight
// Europe/Zurich at 60 s cadence (1440 rows per sensor), interleaved in time order
// so every sensor/track reports each tick; Velocity loops the file.
//
// Run:  node docs/velocity/generate_feeds.mjs
// =============================================================================

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

const START_MS = new Date("2026-08-04T00:00:00+02:00").getTime(); // Tue, local 00:00 (UTC+2)
const STEP_MS = 60 * 1000;
const STEPS = 1440; // 24 h at 1-min cadence

// --- helpers -----------------------------------------------------------------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rnd = (a) => (Math.random() * 2 - 1) * a;
const round = (v, d = 0) => {
  const p = 10 ** d;
  return Math.round(v * p) / p;
};

/** Fraction (0..1) of peak site activity at a given local hour (weekday shift). */
function activityAt(hour) {
  if (hour < 6.5 || hour >= 18.5) return 0.03; // night: skeleton / security
  let f;
  if (hour < 8) f = (hour - 6.5) / 1.5; // ramp 06:30 → 08:00
  else if (hour < 16) f = 1.0; // full day shift
  else if (hour < 17.5) f = 1 - ((hour - 16) / 1.5) * 0.85; // taper 16:00 → 17:30
  else f = 0.12; // wind-down
  if (hour >= 12 && hour < 13) f *= 0.6; // lunch dip
  return clamp(f, 0, 1);
}

/** Solar term 0..1 (0 overnight → 1 mid-afternoon) — drives photochemical ozone. */
const sunAt = (hour) => clamp(Math.cos(((hour - 15) / 24) * 2 * Math.PI), 0, 1);

// Ascending severity ladder → 0..3, matching the on-panel thresholds.
const stepUp = (v, t) => (v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0);
const NOISE_CATS = ["Comfortable", "Elevated", "High", "Excessive"];
const DUST_CATS = ["Good", "Moderate", "High", "Very High"];
const GAS_CATS = ["Normal", "Watch", "Caution", "Hazard"];
const NOISE_T = [70, 80, 85]; // dBA
const DUST_T = [50, 75, 100]; // µg/m³
const GAS_T = {
  co: [9, 25, 35], // ppm
  co2: [800, 1200, 2000], // ppm
  no2: [40, 100, 200], // µg/m³
  o3: [100, 160, 200], // µg/m³
  voc: [500, 1500, 3000], // ppb
  ch4: [5, 25, 50] // ppm
};

// --- sensor placement (Web Mercator 102100 / 3857) ---------------------------
const NOISE_SENSORS = [
  { id: "NOISE-N", track: "b291e7be-9f14-44ed-87c1-0f02b8ca35b3", x: 958926.68, y: 6009858.11, ambient: 50, work: 82 },
  { id: "NOISE-E", track: "7be9696e-9ace-4085-a81b-0b04c83955db", x: 958997.6, y: 6009801.97, ambient: 51, work: 84 },
  { id: "NOISE-S", track: "b543d03f-a7d0-4faa-8507-0b3e31081e0b", x: 958926.68, y: 6009745.83, ambient: 49, work: 80 },
  { id: "NOISE-W", track: "49a1ac8f-b89d-4356-8260-a3e73765a98a", x: 958855.76, y: 6009801.97, ambient: 50, work: 81 },
  { id: "NOISE-NR1", track: "5c7eb3a5-3ace-49d5-b023-33009a594311", x: 959052.26, y: 6009905.39, ambient: 46, work: 66 },
  { id: "NOISE-NR2", track: "a7b30385-932d-4325-b84b-ae6bdcc359e3", x: 958793.71, y: 6009720.71, ambient: 45, work: 63 },
  { id: "NOISE-NR3", track: "74469165-c65c-4435-a387-36920379578d", x: 959103.97, y: 6009772.42, ambient: 47, work: 67 }
];
const DUST_SENSORS = [
  { id: "DUST-01", track: "ad65284f-6a8b-444e-a5f7-d0dcf56b61f9", x: 958941.45, y: 6009809.36, base: 20, work: 78 },
  { id: "DUST-02", track: "5c5c7940-d07e-4e92-8670-ac35e6a7e956", x: 958991.69, y: 6009810.83, base: 18, work: 60 }
];
const GAS_SENSOR = { id: "GAS-01", track: "28dc49c7-651a-4c08-b646-470d8c332f4d", x: 958908.95, y: 6009828.56 };

// --- generators (each metric eases toward its target with a small walk) ------
function genNoise() {
  const rows = [["Timestamp", "SensorID", "TrackID", "Longitude", "Latitude", "NoiseCategory", "LAeq_dBA"]];
  const state = new Map();
  for (let i = 0; i < STEPS; i++) {
    const hour = i / 60;
    const ts = START_MS + i * STEP_MS;
    for (const s of NOISE_SENSORS) {
      const target = s.ambient + (s.work - s.ambient) * activityAt(hour);
      const prev = state.get(s.id);
      const v = prev == null ? target : clamp(prev + (target - prev) * 0.25 + rnd(0.8), 40, 95);
      state.set(s.id, v);
      rows.push([ts, s.id, s.track, s.x, s.y, NOISE_CATS[stepUp(v, NOISE_T)], round(v, 1)]);
    }
  }
  return rows;
}

function genDust() {
  const rows = [["Timestamp", "SensorID", "TrackID", "Longitude", "Latitude", "DustCategory", "PM10_ugm3"]];
  const state = new Map();
  for (let i = 0; i < STEPS; i++) {
    const hour = i / 60;
    const ts = START_MS + i * STEP_MS;
    for (const s of DUST_SENSORS) {
      const target = s.base + (s.work - s.base) * activityAt(hour);
      const prev = state.get(s.id);
      const v = prev == null ? target : clamp(prev + (target - prev) * 0.12 + rnd(1.2), 6, 240);
      state.set(s.id, v);
      rows.push([ts, s.id, s.track, s.x, s.y, DUST_CATS[stepUp(v, DUST_T)], round(v)]);
    }
  }
  return rows;
}

function genGas() {
  const rows = [
    ["Timestamp", "SensorID", "TrackID", "Longitude", "Latitude", "GasCategory", "GasLevel",
      "CO_ppm", "CO2_ppm", "NO2_ugm3", "O3_ugm3", "VOC_ppb", "CH4_ppm"]
  ];
  const s = GAS_SENSOR;
  const st = {};
  const ease = (k, target, amp, lo, hi) => {
    st[k] = st[k] == null ? target : clamp(st[k] + (target - st[k]) * 0.15 + rnd(amp), lo, hi);
    return st[k];
  };
  for (let i = 0; i < STEPS; i++) {
    const hour = i / 60;
    const act = activityAt(hour);
    const sun = sunAt(hour);
    const co = ease("co", 0.3 + 2.0 * act, 0.05, 0.1, 25);
    const co2 = ease("co2", 415 + 180 * act, 4, 400, 2500);
    const no2 = ease("no2", 16 + 26 * act, 0.8, 3, 300); // August: low NO2 base
    const o3 = ease("o3", 34 + 90 * sun, 1.2, 4, 260); // August: high afternoon ozone
    const voc = ease("voc", 90 + 260 * act, 6, 40, 4000);
    const ch4 = ease("ch4", 1.9 + 0.4 * act, 0.03, 1.7, 60);
    const level = Math.max(
      stepUp(co, GAS_T.co), stepUp(co2, GAS_T.co2), stepUp(no2, GAS_T.no2),
      stepUp(o3, GAS_T.o3), stepUp(voc, GAS_T.voc), stepUp(ch4, GAS_T.ch4)
    );
    rows.push([START_MS + i * STEP_MS, s.id, s.track, s.x, s.y, GAS_CATS[level], level,
      round(co, 1), round(co2), round(no2), round(o3), round(voc), round(ch4, 1)]);
  }
  return rows;
}

// --- write -------------------------------------------------------------------
const toCsv = (rows) => rows.map((r) => r.join(",")).join("\n") + "\n";
function write(name, rows) {
  writeFileSync(join(OUT_DIR, name), toCsv(rows));
  console.log(`${name}: ${rows.length - 1} rows`);
}

write("velocity_noise_feed.csv", genNoise());
write("velocity_dust_feed.csv", genDust());
write("velocity_gas_feed.csv", genGas());
