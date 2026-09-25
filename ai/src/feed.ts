// =============================================================================
// feed.ts — the "real" data layer for the Site Conditions agent.
//
// It reads the SAME sources the live sensor panel uses, so answers are grounded:
//   • wind / gas / dust / noise → the sample ArcGIS Velocity CSV feeds already
//     published in this repo (docs/velocity/velocity_*_feed.csv). These are the
//     exact feeds js/progress-sensors.js polls; the Velocity StreamServer URLs in
//     js/velocity.js are still blank, so the CSVs are the current source of truth.
//   • temperature / humidity / air-quality → Open-Meteo (live, no API key).
//
// Thresholds and categories below mirror js/velocity.js — keep them in sync.
// =============================================================================

const CSV_BASE =
  "https://raw.githubusercontent.com/dchantlos/construction-timelapse/main/docs/velocity";

const SITE_COORD = { lat: 47.4133, lon: 8.6142 };

const WIND = {
  field: "WindSpeed_ms",
  gustField: "WindGust_ms",
  dirField: "WindDir_deg",
  unit: "m/s",
  primary: "WIND-01",
  thresholds: [6, 12, 20], // Calm · Breeze · Windy · High (tower-crane stand-down)
  categories: ["Calm", "Breeze", "Windy", "High"],
};

const DUST = {
  field: "PM10_ugm3",
  unit: "µg/m³",
  primary: "DUST-01",
  thresholds: [50, 75, 100], // Good · Moderate · High · Very High
  categories: ["Good", "Moderate", "High", "Very High"],
};

const NOISE = {
  field: "LAeq_dBA",
  unit: "dBA",
  thresholds: [70, 80, 85], // Comfortable · Elevated · High · Excessive
  categories: ["Comfortable", "Elevated", "High", "Excessive"],
};

const GAS_PRIMARY = "GAS-01";
const GAS_CATEGORIES = ["Normal", "Watch", "Caution", "Hazard"];
const GAS_PARAMS = [
  { key: "CO", field: "CO_ppm", unit: "ppm", thresholds: [9, 25, 35] },
  { key: "CO2", field: "CO2_ppm", unit: "ppm", thresholds: [800, 1200, 2000] },
  { key: "NO2", field: "NO2_ugm3", unit: "µg/m³", thresholds: [40, 100, 200] },
  { key: "O3", field: "O3_ugm3", unit: "µg/m³", thresholds: [100, 160, 200] },
  { key: "VOC", field: "VOC_ppb", unit: "ppb", thresholds: [500, 1500, 3000] },
  { key: "CH4", field: "CH4_ppm", unit: "ppm", thresholds: [5, 25, 50] },
];

/** Map a numeric value to its category via ascending thresholds. */
function classify(value: number, thresholds: number[], categories: string[]): string {
  let i = 0;
  while (i < thresholds.length && value >= thresholds[i]) i++;
  return categories[Math.min(i, categories.length - 1)];
}

interface Csv {
  header: string[];
  rows: string[][];
}

async function fetchCsv(name: string): Promise<Csv> {
  const res = await fetch(`${CSV_BASE}/velocity_${name}_feed.csv`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name} feed HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = lines.slice(1).map((l) => l.split(","));
  return { header, rows };
}

/** The latest row (max Timestamp) for a given sensor id. */
function latestFor(csv: Csv, sensorId: string): string[] | null {
  const sidIdx = csv.header.indexOf("SensorID");
  const tsIdx = csv.header.indexOf("Timestamp");
  let best: string[] | null = null;
  let bestTs = -Infinity;
  for (const r of csv.rows) {
    if (r[sidIdx] !== sensorId) continue;
    const ts = Number(r[tsIdx]);
    if (ts > bestTs) {
      bestTs = ts;
      best = r;
    }
  }
  return best;
}

function num(csv: Csv, row: string[], field: string): number {
  return Number(row[csv.header.indexOf(field)]);
}

async function readWind() {
  const csv = await fetchCsv("wind");
  const r = latestFor(csv, WIND.primary);
  if (!r) throw new Error("no wind reading");
  const speed = num(csv, r, WIND.field);
  const gust = num(csv, r, WIND.gustField);
  const dir = num(csv, r, WIND.dirField);
  return {
    speed_ms: speed,
    gust_ms: gust,
    direction_deg: dir,
    category: classify(speed, WIND.thresholds, WIND.categories),
    craneStandDownThreshold_ms: WIND.thresholds[2],
    measuredAt: "tower-crane apex (~582 m)",
  };
}

async function readGas() {
  const csv = await fetchCsv("gas");
  const r = latestFor(csv, GAS_PRIMARY);
  if (!r) throw new Error("no gas reading");
  const readings: Record<string, unknown> = {};
  const flagged: unknown[] = [];
  let worst = 0;
  for (const p of GAS_PARAMS) {
    const v = num(csv, r, p.field);
    const cat = classify(v, p.thresholds, GAS_CATEGORIES);
    readings[p.key] = { value: v, unit: p.unit, category: cat };
    const idx = GAS_CATEGORIES.indexOf(cat);
    if (idx >= 1) {
      flagged.push({
        gas: p.key,
        value: v,
        unit: p.unit,
        category: cat,
        watch: p.thresholds[0],
        caution: p.thresholds[1],
        hazard: p.thresholds[2],
      });
    }
    worst = Math.max(worst, idx);
  }
  return { overall: GAS_CATEGORIES[worst], flagged, readings, sensor: "on-site multi-gas cabinet (GAS-01)" };
}

async function readDust() {
  const csv = await fetchCsv("dust");
  const r = latestFor(csv, DUST.primary);
  if (!r) throw new Error("no dust reading");
  const v = num(csv, r, DUST.field);
  return { pm10_ugm3: v, unit: DUST.unit, category: classify(v, DUST.thresholds, DUST.categories) };
}

async function readNoise() {
  const csv = await fetchCsv("noise");
  const vIdx = csv.header.indexOf(NOISE.field);
  const tsIdx = csv.header.indexOf("Timestamp");
  let maxTs = -Infinity;
  for (const r of csv.rows) {
    const t = Number(r[tsIdx]);
    if (t > maxTs) maxTs = t;
  }
  let worst = -Infinity;
  for (const r of csv.rows) {
    if (Number(r[tsIdx]) === maxTs) {
      const v = Number(r[vIdx]);
      if (v > worst) worst = v;
    }
  }
  if (worst === -Infinity) throw new Error("no noise reading");
  return { laeq_dba: worst, unit: NOISE.unit, category: classify(worst, NOISE.thresholds, NOISE.categories), note: "worst LAeq across boundary microphones" };
}

async function readWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${SITE_COORD.lat}&longitude=${SITE_COORD.lon}` +
    "&current=temperature_2m,relative_humidity_2m&timezone=Europe%2FZurich";
  const w = await fetch(url).then((r) => r.json());
  return {
    temperature_c: w?.current?.temperature_2m ?? null,
    humidity_pct: w?.current?.relative_humidity_2m ?? null,
    source: "Open-Meteo (live)",
  };
}

async function readAirQuality() {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${SITE_COORD.lat}&longitude=${SITE_COORD.lon}` +
    "&current=us_aqi&timezone=Europe%2FZurich";
  const a = await fetch(url).then((r) => r.json());
  return { us_aqi: a?.current?.us_aqi ?? null, source: "Open-Meteo (live)" };
}

async function settle<T>(p: Promise<T>): Promise<T | { error: string }> {
  try {
    return await p;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Everything at once — used by the general getSiteConditions tool. */
export async function getSiteConditions() {
  const [wind, gas, dust, noise, weather, airQuality] = await Promise.all([
    settle(readWind()),
    settle(readGas()),
    settle(readDust()),
    settle(readNoise()),
    settle(readWeather()),
    settle(readAirQuality()),
  ]);
  return {
    site: "Zürich, CH",
    generatedAt: new Date().toISOString(),
    source:
      "wind/gas/dust/noise = sample ArcGIS Velocity telemetry (repo feed); temperature/humidity/air-quality = Open-Meteo (live)",
    wind,
    gas,
    dust,
    noise,
    weather,
    airQuality,
  };
}

/** Focused tower-crane wind safety verdict. */
export async function assessCrane() {
  const w = await readWind();
  const standDown = w.craneStandDownThreshold_ms; // 20 m/s
  const caution = WIND.thresholds[1]; // 12 m/s
  let verdict: string;
  let rationale: string;
  if (w.speed_ms >= standDown || w.gust_ms >= standDown) {
    verdict = "STAND DOWN";
    rationale = `Wind ${w.speed_ms} m/s (gust ${w.gust_ms} m/s) is at or above the ${standDown} m/s tower-crane stand-down limit. Stop lifting.`;
  } else if (w.category === "Windy" || w.gust_ms >= caution) {
    verdict = "CAUTION";
    rationale = `Wind ${w.speed_ms} m/s (gust ${w.gust_ms} m/s) is elevated (above ${caution} m/s). Restrict large sail-area lifts and monitor closely.`;
  } else {
    verdict = "OK TO LIFT";
    rationale = `Wind ${w.speed_ms} m/s (gust ${w.gust_ms} m/s), category "${w.category}" — below the ${caution} m/s caution level.`;
  }
  return { verdict, rationale, ...w, source: "Sample Velocity wind feed (repo)" };
}

/** Focused harmful-gas assessment. */
export async function assessGas() {
  const g = await readGas();
  return { ...g, source: "Sample Velocity gas feed (repo)" };
}

// =============================================================================
// Time-series analysis — pattern/trend analysis and crane-lift planning over
// the full day of sensor telemetry (not just the latest reading).
// =============================================================================

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function zurichTime(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Zurich",
  }).format(new Date(ts));
}

async function seriesFor(name: string, sensorId: string, field: string): Promise<{ ts: number; v: number }[]> {
  const csv = await fetchCsv(name);
  const sidIdx = csv.header.indexOf("SensorID");
  const tsIdx = csv.header.indexOf("Timestamp");
  const vIdx = csv.header.indexOf(field);
  const out: { ts: number; v: number }[] = [];
  for (const r of csv.rows) {
    if (r[sidIdx] !== sensorId) continue;
    const ts = Number(r[tsIdx]);
    const v = Number(r[vIdx]);
    if (Number.isFinite(ts) && Number.isFinite(v)) out.push({ ts, v });
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

interface SeriesStat {
  samples: number;
  current: number;
  min: number;
  max: number;
  avg: number;
  peakAt: string;
  lowAt: string;
  trend: "rising" | "falling" | "steady";
}

function summarize(series: { ts: number; v: number }[]): SeriesStat | null {
  const n = series.length;
  if (n < 2) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let minTs = 0;
  let maxTs = 0;
  for (const p of series) {
    sum += p.v;
    if (p.v < min) {
      min = p.v;
      minTs = p.ts;
    }
    if (p.v > max) {
      max = p.v;
      maxTs = p.ts;
    }
  }
  // Trend: mean of the last ~10% vs the ~10% before it.
  const k = Math.max(2, Math.floor(n * 0.1));
  const recent = series.slice(-k).reduce((s, p) => s + p.v, 0) / k;
  const priorSlice = series.slice(-2 * k, -k);
  const prior = priorSlice.length ? priorSlice.reduce((s, p) => s + p.v, 0) / priorSlice.length : recent;
  const band = (max - min) * 0.05;
  const trend = Math.abs(recent - prior) < band ? "steady" : recent > prior ? "rising" : "falling";
  return {
    samples: n,
    current: round(series[n - 1].v),
    min: round(min),
    max: round(max),
    avg: round(sum / n),
    peakAt: zurichTime(maxTs),
    lowAt: zurichTime(minTs),
    trend,
  };
}

/** Contiguous spans where the value stays below a threshold (as HH:MM ranges). */
function belowWindows(series: { ts: number; v: number }[], threshold: number): { from: string; to: string }[] {
  const spans: { from: string; to: string }[] = [];
  let startTs: number | null = null;
  for (let i = 0; i < series.length; i++) {
    const below = series[i].v < threshold;
    if (below && startTs === null) startTs = series[i].ts;
    const isLast = i === series.length - 1;
    if ((!below || isLast) && startTs !== null) {
      const endTs = below && isLast ? series[i].ts : series[i - 1].ts;
      spans.push({ from: zurichTime(startTs), to: zurichTime(endTs) });
      startTs = null;
    }
  }
  return spans;
}

/** Whole-day trend/pattern analysis across the key metrics. */
export async function analyzeConditionTrends() {
  const [wind, dust, o3, no2, noise] = await Promise.all([
    seriesFor("wind", WIND.primary, WIND.field).then(summarize),
    seriesFor("dust", DUST.primary, DUST.field).then(summarize),
    seriesFor("gas", GAS_PRIMARY, "O3_ugm3").then(summarize),
    seriesFor("gas", GAS_PRIMARY, "NO2_ugm3").then(summarize),
    seriesFor("noise", "NOISE-N", NOISE.field).then(summarize),
  ]);
  return {
    site: "Zürich, CH",
    basis:
      "Whole-day sensor time series (sample ArcGIS Velocity telemetry) analysed for min/max/average, the time of day each metric peaks, and its recent trend.",
    wind: wind && { unit: "m/s", ...wind, craneCaution_ms: WIND.thresholds[1], craneStandDown_ms: WIND.thresholds[2] },
    dust_pm10: dust && { unit: "µg/m³", ...dust, highThreshold: DUST.thresholds[1] },
    ozone_o3: o3 && { unit: "µg/m³", ...o3 },
    no2: no2 && { unit: "µg/m³", ...no2 },
    noise: noise && { unit: "dBA", ...noise, highThreshold: NOISE.thresholds[1] },
  };
}

/** Recommend tower-crane lifting windows from the day's wind time series. */
export async function craneLiftWindows() {
  const speed = await seriesFor("wind", WIND.primary, WIND.field);
  const gust = await seriesFor("wind", WIND.primary, WIND.gustField);
  const s = summarize(speed);
  if (!s) throw new Error("no wind series");
  let maxGust = -Infinity;
  let maxGustTs = 0;
  for (const p of gust) {
    if (p.v > maxGust) {
      maxGust = p.v;
      maxGustTs = p.ts;
    }
  }
  return {
    basis: "Analysis of today's crane-apex wind time series (sample telemetry).",
    current_ms: s.current,
    trend: s.trend,
    todayMax_ms: s.max,
    todayPeakAt: s.peakAt,
    todayMaxGust_ms: round(maxGust),
    todayMaxGustAt: zurichTime(maxGustTs),
    cautionThreshold_ms: WIND.thresholds[1],
    standDownThreshold_ms: WIND.thresholds[2],
    recommendedLiftWindows: belowWindows(speed, WIND.thresholds[1]),
    note: "Windows are spans where the 10-minute mean wind stays below the caution level; always re-check live gusts immediately before a lift.",
  };
}

/** Estimate crane-hours lost to high wind today (proxy for wind-driven downtime). */
export async function windImpactHours() {
  const speed = await seriesFor("wind", WIND.primary, WIND.field);
  if (speed.length < 2) return { cautionHours: 0, standDownHours: 0, peakWind_ms: 0 };
  const gaps: number[] = [];
  for (let i = 1; i < speed.length; i++) gaps.push(speed[i].ts - speed[i - 1].ts);
  gaps.sort((a, b) => a - b);
  const stepH = (gaps[Math.floor(gaps.length / 2)] || 60000) / 3_600_000; // median sample gap → hours
  let cautionH = 0;
  let standH = 0;
  let peak = -Infinity;
  for (const p of speed) {
    if (p.v > peak) peak = p.v;
    if (p.v >= WIND.thresholds[1]) cautionH += stepH;
    if (p.v >= WIND.thresholds[2]) standH += stepH;
  }
  return { cautionHours: round(cautionH), standDownHours: round(standH), peakWind_ms: round(peak) };
}
