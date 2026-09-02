// =============================================================================
// progress-sensors.js — draggable "Live Sensors on Site" panel.
//
// On-site environmental telemetry for the Current Construction Progress view:
// temperature, humidity, wind speed, air quality, dust, a full harmful-gas
// panel (CO, CO₂, NO₂, O₃, VOCs, CH₄), noise, plus live counts of workers and
// vehicles on site. Wind is the 10-minute mean at the tallest tower crane's
// apex (~10 m above the top working deck) — the most exposed, code-relevant
// point for crane and working-at-height decisions.
// Readings are modelled on the job site's real geography — Zürich, Switzerland
// (47.41°N, 8.61°E, derived from the progress WebScene's camera) — using
// monthly climate normals plus site-local time-of-day and construction-activity
// patterns. Open the site in December and it shows cold, humid winter air;
// open it in July and it shows warm summer conditions.
//
// Values don't jump: each reading eases toward its computed target and wanders
// with a small bounded random walk, so the feed drifts gradually and
// realistically over time. There is no backend or weather API — this is a
// deterministic model of expected conditions, not a live measured feed.
//
// Wind, noise, dust and gas now stream live from ArcGIS Velocity (via
// velocity-live.js → liveStore); those figures override the model when fresh.
// Temperature/humidity/AQI stay on Open-Meteo; worker/vehicle counts modelled.
// =============================================================================

import { liveStore, setLocationsVisible, setTypeVisible, gasAssess } from "./velocity-live.js?v=7";
import { VELOCITY } from "./velocity.js";

const SITE = { label: "Zürich, CH", tz: "Europe/Zurich", lat: 47.4133, lon: 8.6142 };

// --- Live open data ----------------------------------------------------------
// Real temperature, humidity and air quality for the job-site coordinates come
// from Open-Meteo (https://open-meteo.com): open data, no API key, CORS-enabled,
// free for non-commercial use. Everything else stays modelled. The fallback is
// layered: a stalled request is aborted after a timeout, the last good reading
// is cached (memory + localStorage) and keeps driving the panel through a short
// outage, and once that cache goes stale the model resumes automatically.
const LIVE_WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${SITE.lat}&longitude=${SITE.lon}` +
  "&current=temperature_2m,relative_humidity_2m&timezone=Europe%2FZurich";
const LIVE_AQI_URL =
  `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${SITE.lat}&longitude=${SITE.lon}` +
  "&current=us_aqi&timezone=Europe%2FZurich";
const LIVE_REFRESH_MS = 10 * 60 * 1000; // source updates hourly at most; poll every 10 min
const LIVE_FETCH_TIMEOUT_MS = 8000; // abort a stalled request so the fallback kicks in fast
const LIVE_MAX_AGE_MS = 3 * 60 * 60 * 1000; // trust the last good real reading for up to 3h
const LIVE_CACHE_KEY = "sensorLiveCache"; // last good reading, to survive reloads

// Last good real readings (ts = 0 until the first success). While these stay
// fresh they drive temp/humidity/AQI; once stale the model takes over.
const live = { temp: null, humidity: null, aqi: null, ts: 0 };
const liveFresh = () => live.ts > 0 && Date.now() - live.ts < LIVE_MAX_AGE_MS;

// --- Zürich monthly climate normals, indexed Jan(0) … Dec(11) ----------------
const TEMP_AVG_C = [0.3, 1.4, 5.3, 8.9, 13.3, 16.6, 18.6, 18.0, 13.9, 9.6, 4.3, 1.4]; // °C
const TEMP_SWING = [3.0, 3.5, 4.5, 5.5, 6.5, 7.0, 7.2, 7.0, 6.0, 4.5, 3.2, 2.8]; // diurnal amplitude
const HUM_AVG = [80, 76, 71, 68, 70, 70, 70, 73, 78, 82, 82, 82]; // %
const AQI_BASE = [58, 55, 48, 44, 46, 52, 60, 58, 50, 48, 54, 60]; // index
const PM10_BASE = [26, 28, 32, 36, 40, 44, 50, 48, 38, 32, 28, 26]; // µg/m³
const NO2_BASE = [46, 44, 38, 32, 28, 24, 22, 23, 30, 38, 44, 48]; // µg/m³ nitrogen dioxide
const O3_BASE = [28, 34, 48, 62, 74, 84, 92, 88, 68, 48, 32, 26]; // µg/m³ ozone (summer/afternoon peak)
const WIND_BASE = [3.4, 3.6, 3.8, 3.7, 3.3, 3.1, 3.0, 2.9, 2.9, 3.0, 3.2, 3.3]; // m/s, 10 m mean

// Wind is read at the tallest tower crane's apex (see header). Wind speed grows
// with height, so the 10 m monthly normals are scaled up to crane-top by a
// power-law gradient factor: (h/10)^0.16 ≈ 1.33 for a ~60 m jib over built-up terrain.
const WIND_CRANE_GAIN = 1.33;

// Site head-count model: peak weekday day-shift crew + on-site vehicle fleet.
const CREW_PEAK = 52; // workers at full weekday day shift
const VEH_PARKED = 4; // machines that stay on site overnight
const VEH_ACTIVE = 12; // extra vehicles moving during active work

const SEASONS = [
  "winter", "winter", "spring", "spring", "spring", "summer",
  "summer", "summer", "autumn", "autumn", "autumn", "winter"
];

// Four-step alert scale: green (good) → yellow → orange → red (bad).
const SCALE = ["#4ade80", "#facc15", "#fb923c", "#f87171"];

// Panel alert ladders shared by the compact rows and the detail breakdown so
// they colour identically. Wind is the crane-ops ladder (deliberately stricter
// than the meteorological Calm/Breeze bands used by the 3D scene markers).
const WIND_LADDER = [9, 14, 20];
const NOISE_LADDER = [75, 82, 88];

const rand = (amp) => (Math.random() * 2 - 1) * amp;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Site-local calendar/clock parts (so seasonality tracks Zürich, not the viewer). */
function siteParts(now) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SITE.tz,
      hour12: false,
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short"
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value])
  );
  return {
    month: parseInt(p.month, 10) - 1, // 0–11
    day: parseInt(p.day, 10), // 1–31
    hour: parseInt(p.hour, 10) + parseInt(p.minute, 10) / 60,
    weekend: p.weekday === "Sat" || p.weekday === "Sun",
    clock: `${p.hour}:${p.minute}`
  };
}

/** Blend a monthly-normal array across the month for smooth seasonal drift. */
function seasonal(arr, month, day) {
  const frac = clamp(day, 1, 30) / 30;
  return arr[month] * (1 - frac) + arr[(month + 1) % 12] * frac;
}

/** Fraction (0–1) of the peak day-shift crew on site at this local hour. */
function crewFactor({ hour, weekend }) {
  if (weekend) return hour >= 8 && hour <= 14 ? 0.12 : 0.0; // small weekend crew
  if (hour < 6.5 || hour >= 18.5) return 0.03; // night: security / skeleton only
  let f;
  if (hour < 8) f = (hour - 6.5) / 1.5; // ramp up 06:30 → 08:00
  else if (hour < 16) f = 1.0; // full day shift
  else if (hour < 17.5) f = 1 - ((hour - 16) / 1.5) * 0.8; // taper 16:00 → 17:30
  else f = 0.12; // wind-down 17:30 → 18:30
  if (hour >= 12 && hour < 13) f *= 0.6; // lunch dip
  return clamp(f, 0, 1);
}

/** Deterministic "expected" value of every sensor for the given moment. */
function computeTargets(now) {
  const parts = siteParts(now);
  const { month, day, hour, weekend } = parts;

  // Diurnal shape: +1 at ~15:00 (warmest), −1 at ~03:00 (coolest).
  const diurnal = Math.cos(((hour - 15) / 24) * 2 * Math.PI);
  const sun = clamp(diurnal, 0, 1); // 0 overnight → 1 mid-afternoon (drives ozone)

  // Construction-activity factor: busiest on weekday work hours, quiet at night.
  let activity;
  if (hour >= 7 && hour < 18) activity = weekend ? 0.35 : 1.0;
  else if (hour >= 6 && hour < 20) activity = weekend ? 0.2 : 0.5;
  else activity = 0.1;

  const baseT = seasonal(TEMP_AVG_C, month, day);
  const cold = clamp((8 - baseT) / 20, 0, 0.6); // winter-inversion weighting
  const crew = crewFactor(parts);

  return {
    temp: baseT + seasonal(TEMP_SWING, month, day) * diurnal,
    humidity: clamp(seasonal(HUM_AVG, month, day) - 12 * diurnal, 32, 99),
    // 10-min mean at crane-top: seasonal 10 m normal × height gain, with a mild
    // afternoon lift from daytime thermal mixing (sun: 0 overnight → 1 mid-day).
    wind: clamp(seasonal(WIND_BASE, month, day) * WIND_CRANE_GAIN * (0.85 + 0.3 * sun), 0.3, 32),
    aqi: clamp(seasonal(AQI_BASE, month, day) * (0.75 + 0.35 * activity), 8, 180),
    dust: clamp(seasonal(PM10_BASE, month, day) * (0.6 + 0.6 * activity), 5, 220),
    co: clamp(0.3 + 2.0 * activity + cold * 0.8, 0.1, 25),
    co2: clamp(415 + 180 * activity + cold * 45, 400, 2500),
    no2: clamp(seasonal(NO2_BASE, month, day) * (0.55 + 0.7 * activity) + cold * 8, 3, 300),
    o3: clamp(seasonal(O3_BASE, month, day) * (0.4 + 0.9 * sun), 4, 260),
    voc: clamp(90 + 260 * activity, 40, 4000),
    ch4: clamp(1.9 + 0.4 * activity, 1.7, 60),
    noise: clamp(58 + 28 * activity, 42, 96),
    workers: CREW_PEAK * crew,
    vehicles: VEH_PARKED + VEH_ACTIVE * crew,
    season: SEASONS[month]
  };
}

// Per-metric smoothing: each reading eases toward its target (ease) and wanders
// with a small bounded random walk (noise), so values change gradually not in
// big jumps. RANGE keeps every smoothed value within a sane physical band.
const SMOOTH = {
  temp: { ease: 0.08, noise: 0.1 },
  humidity: { ease: 0.08, noise: 0.5 },
  wind: { ease: 0.06, noise: 0.12 }, // slow drift — behaves like a 10-min mean
  aqi: { ease: 0.1, noise: 0.7 },
  dust: { ease: 0.1, noise: 1.0 },
  co: { ease: 0.1, noise: 0.05 },
  co2: { ease: 0.1, noise: 5 },
  no2: { ease: 0.1, noise: 0.8 },
  o3: { ease: 0.1, noise: 1.0 },
  voc: { ease: 0.1, noise: 6 },
  ch4: { ease: 0.1, noise: 0.03 },
  noise: { ease: 0.12, noise: 0.6 },
  workers: { ease: 0.12, noise: 0.25 },
  vehicles: { ease: 0.14, noise: 0.12 }
};
const RANGE = {
  temp: [-25, 45], humidity: [32, 99], wind: [0.3, 32], aqi: [8, 180], dust: [5, 220],
  co: [0.1, 25], co2: [400, 2500], no2: [3, 300], o3: [4, 260],
  voc: [40, 4000], ch4: [1.7, 60], noise: [42, 96],
  workers: [0, CREW_PEAK + 4], vehicles: [0, VEH_PARKED + VEH_ACTIVE + 4]
};

let state = null;
// Last painted reading + level map, shared with the detail dashboard.
let lastR = null;
let lastLvl = null;

const finite = (v) => (typeof v === "number" && isFinite(v) ? v : null);

/** Persist the last good reading so a reload during an outage still shows it. */
function saveLiveCache() {
  try {
    localStorage.setItem(
      LIVE_CACHE_KEY,
      JSON.stringify({ temp: live.temp, humidity: live.humidity, aqi: live.aqi, ts: live.ts })
    );
  } catch {
    // storage unavailable (private mode / quota) — the in-memory cache still works
  }
}

/** Rehydrate the last good reading from a previous session, if it exists. */
function loadLiveCache() {
  try {
    const c = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY) || "null");
    if (c && typeof c.ts === "number") {
      live.temp = finite(c.temp);
      live.humidity = finite(c.humidity);
      live.aqi = finite(c.aqi);
      live.ts = c.ts;
    }
  } catch {
    // corrupt or unavailable cache — ignore and fetch fresh
  }
}

/**
 * Pull real temp/humidity/AQI from Open-Meteo. On any failure (offline, HTTP
 * error, or timeout) the last good reading is kept until it goes stale, at which
 * point liveFresh() returns false and the model takes over automatically.
 */
async function fetchLive() {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), LIVE_FETCH_TIMEOUT_MS);
  try {
    const [wx, air] = await Promise.all([
      fetch(LIVE_WEATHER_URL, { signal: ctrl.signal }).then((res) => {
        if (!res.ok) throw new Error(`weather ${res.status}`);
        return res.json();
      }),
      fetch(LIVE_AQI_URL, { signal: ctrl.signal }).then((res) => {
        if (!res.ok) throw new Error(`air ${res.status}`);
        return res.json();
      })
    ]);
    const temp = finite(wx?.current?.temperature_2m);
    const humidity = finite(wx?.current?.relative_humidity_2m);
    const aqi = finite(air?.current?.us_aqi);
    if (temp == null && humidity == null && aqi == null) return; // keep last good
    live.temp = temp;
    live.humidity = humidity;
    live.aqi = aqi;
    live.ts = Date.now();
    saveLiveCache();
  } catch {
    // offline / blocked / timeout — keep the cached reading (gated by liveFresh)
  } finally {
    clearTimeout(timeout);
  }
}

// --- Live Velocity feed integration ------------------------------------------
// velocity-live.js owns the WebSocket connections and writes the latest
// readings into liveStore; here we fold those figures into the panel.
const VEL_FRESH_MS = 30000; // a Velocity feed counts as "live" if seen within 30s

/**
 * Override modelled targets with fresh Velocity readings. Returns the set of
 * keys that are live this tick, so they snap to the real figure instead of
 * easing (fast live data shouldn't lag behind a smoothing filter).
 */
function applyVelocity(target, nowMs = Date.now()) {
  const liveKeys = new Set();
  const fresh = (f) => liveStore[f].ts > 0 && nowMs - liveStore[f].ts < VEL_FRESH_MS;

  if (fresh("wind") && liveStore.wind.speed != null) {
    target.wind = clamp(liveStore.wind.speed, RANGE.wind[0], RANGE.wind[1]);
    liveKeys.add("wind");
  }
  if (fresh("noise") && liveStore.noise.laeq != null) {
    target.noise = clamp(liveStore.noise.laeq, RANGE.noise[0], RANGE.noise[1]);
    liveKeys.add("noise");
  }
  if (fresh("dust") && liveStore.dust.pm10 != null) {
    target.dust = clamp(liveStore.dust.pm10, RANGE.dust[0], RANGE.dust[1]);
    liveKeys.add("dust");
  }
  if (fresh("gas")) {
    const g = liveStore.gas;
    for (const [k, v] of Object.entries({ co: g.co, co2: g.co2, no2: g.no2, o3: g.o3, voc: g.voc, ch4: g.ch4 })) {
      if (v != null) {
        target[k] = clamp(v, RANGE[k][0], RANGE[k][1]);
        liveKeys.add(k);
      }
    }
  }
  return liveKeys;
}

/** Advance the smoothed sensor state one tick toward its deterministic targets. */
function stepSensors(now = new Date()) {
  const target = computeTargets(now);
  if (liveFresh()) {
    // Fresh real readings override the modelled targets; smoothing eases toward
    // them. Once the cache goes stale this is skipped and the model resumes.
    if (live.temp != null) target.temp = live.temp;
    if (live.humidity != null) target.humidity = clamp(live.humidity, 32, 99);
    if (live.aqi != null) target.aqi = clamp(live.aqi, 8, 180);
  }
  // Fresh Velocity readings win outright and snap (no easing lag).
  const velKeys = applyVelocity(target);
  if (!state) {
    state = { ...target }; // start already at realistic values (no ramp-in)
  } else {
    for (const key of Object.keys(SMOOTH)) {
      if (velKeys.has(key)) {
        state[key] = target[key]; // live feed → show the real figure directly
        continue;
      }
      const cfg = SMOOTH[key];
      const next = state[key] + (target[key] - state[key]) * cfg.ease + rand(cfg.noise);
      const [lo, hi] = RANGE[key];
      state[key] = clamp(next, lo, hi);
    }
    state.season = target.season;
  }
  return state;
}

// --- Status classification ---------------------------------------------------
// Threshold ladders: crossing t[0] → yellow, t[1] → orange, t[2] → red.
const stepUp = (v, t) => (v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0);

// Two-sided ladder [redLo, orangeLo, yellowLo, yellowHi, orangeHi, redHi] for
// readings that are bad when either too low or too high (temperature, humidity).
function stepBi(v, t) {
  if (v <= t[0] || v >= t[5]) return 3;
  if (v <= t[1] || v >= t[4]) return 2;
  if (v <= t[2] || v >= t[3]) return 1;
  return 0;
}

const AQI_LABELS = ["Good", "Moderate", "Sensitive", "Unhealthy"];
const NAMES = {
  temp: "temperature",
  humidity: "humidity",
  wind: "wind",
  aqi: "air quality",
  dust: "dust",
  gas: "gas levels",
  noise: "noise"
};

function joinNames(list) {
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Overall work-readiness assessment from per-reading severity levels (0–3). */
function assess(levels) {
  const entries = Object.entries(levels);
  const max = entries.reduce((m, [, l]) => Math.max(m, l), 0);
  const namesAt = (min) => entries.filter(([, l]) => l >= min).map(([k]) => NAMES[k]);
  const color = SCALE[max];

  if (max === 0) {
    return {
      color,
      head: "Good to work",
      detail: "All site conditions are within safe limits for construction."
    };
  }
  if (max === 1) {
    const items = namesAt(1);
    return {
      color,
      head: "Good — minor watch",
      detail: `Conditions are fine for work; ${joinNames(items)} ${items.length > 1 ? "are" : "is"} slightly elevated.`
    };
  }
  if (max === 2) {
    const items = namesAt(2);
    return {
      color,
      head: "Caution — monitor closely",
      detail: `${cap(joinNames(items))} ${items.length > 1 ? "are" : "is"} outside the ideal range. Monitor crews and apply mitigations.`
    };
  }
  const items = namesAt(3);
  return {
    color,
    head: "Pause affected work",
    detail: `${cap(joinNames(items))} ${items.length > 1 ? "have" : "has"} reached unsafe levels. Pause the affected activities until readings recover.`
  };
}

const $ = (id) => document.getElementById(id);

/** Flash a value element when it changes, for a "live update" feel. */
function flash(el) {
  el?.animate?.([{ opacity: 0.35 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
}

function setVal(id, text, color) {
  const el = $(id);
  if (!el) return;
  if (el.textContent !== text) flash(el);
  el.textContent = text;
  if (color) el.style.color = color;
}

function setDot(id, color) {
  const el = $(id);
  if (!el) return;
  el.style.background = color;
  el.style.boxShadow = `0 0 8px -1px ${color}`;
}

/** Paint a single reading's value + status dot in one alert colour. */
function paintReading(valId, dotId, text, color) {
  setVal(valId, text, color);
  setDot(dotId, color);
}

/** Repaint every reading from the smoothed state and refresh the status summary. */
function paint(now = new Date()) {
  const r = stepSensors(now);

  const gasA = gasAssess({ co: r.co, co2: r.co2, no2: r.no2, o3: r.o3, voc: r.voc, ch4: r.ch4 });
  const gasLvl = gasA.level;

  const lvl = {
    temp: stepBi(r.temp, [-6, 0, 3, 27, 31, 35]),
    humidity: stepBi(r.humidity, [12, 20, 30, 72, 85, 93]),
    // Tower-crane wind ladder: 9 caution (restrict sail loads) · 14 stop most
    // lifting · 20 crane to weathervane / out of service.
    wind: stepUp(r.wind, WIND_LADDER),
    aqi: stepUp(r.aqi, [51, 101, 151]),
    dust: stepUp(r.dust, [50, 75, 100]),
    gas: gasLvl,
    noise: stepUp(r.noise, NOISE_LADDER)
  };
  lastR = r;
  lastLvl = lvl;

  paintReading("snTemp", "dotTemp", r.temp.toFixed(1), SCALE[lvl.temp]);
  paintReading("snHum", "dotHum", `${Math.round(r.humidity)}`, SCALE[lvl.humidity]);
  paintReading("snWind", "dotWind", r.wind.toFixed(1), SCALE[lvl.wind]);

  paintReading("snAqi", "dotAqi", `${Math.round(r.aqi)}`, SCALE[lvl.aqi]);
  const catEl = $("snAqiCat");
  if (catEl) catEl.textContent = AQI_LABELS[lvl.aqi];

  paintReading("snDust", "dotDust", `${Math.round(r.dust)}`, SCALE[lvl.dust]);

  // Extended harmful-gas panel — each gas coloured on its own threshold ladder.
  setVal("snCo", r.co.toFixed(1), SCALE[stepUp(r.co, [9, 25, 35])]);
  setVal("snNo2", `${Math.round(r.no2)}`, SCALE[stepUp(r.no2, [40, 100, 200])]);
  setVal("snO3", `${Math.round(r.o3)}`, SCALE[stepUp(r.o3, [100, 160, 200])]);
  setVal("snCo2", `${Math.round(r.co2)}`, SCALE[stepUp(r.co2, [800, 1200, 2000])]);
  setVal("snVoc", `${Math.round(r.voc)}`, SCALE[stepUp(r.voc, [500, 1500, 3000])]);
  setVal("snCh4", r.ch4.toFixed(1), SCALE[stepUp(r.ch4, [5, 25, 50])]);
  setDot("dotGas", SCALE[gasLvl]);
  const gw = $("snGasWatch");
  if (gw) {
    if (gasA.drivers.length) {
      gw.textContent = `${VELOCITY.gas.categories[gasLvl]} · ${gasA.drivers.map((d) => d.label).join(", ")}`;
      gw.style.color = SCALE[gasLvl];
    } else {
      gw.textContent = "All clear";
      gw.style.color = "";
    }
  }

  paintReading("snNoise", "dotNoise", `${Math.round(r.noise)}`, SCALE[lvl.noise]);

  // Site head-counts (neutral — reported, not part of the hazard assessment).
  setVal("snWorkers", `${Math.round(r.workers)}`);
  setVal("snVehicles", `${Math.round(r.vehicles)}`);

  const status = assess(lvl);
  setDot("summaryDot", status.color);
  const head = $("summaryHead");
  if (head) {
    head.textContent = status.head;
    head.style.color = status.color;
  }
  const detail = $("summaryDetail");
  if (detail) detail.textContent = status.detail;

  paintDetail();
}

// --- Expanded "full detail" view ---------------------------------------------
const COMPASS16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass16 = (deg) => COMPASS16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const CONN_STATE = {
  streaming: { text: "live", color: "#34d399" },
  connecting: { text: "connecting", color: "#facc15" },
  reconnecting: { text: "reconnecting", color: "#fb923c" },
  offline: { text: "offline", color: "#f87171" }
};

/** A data-source chip with a connection-state dot. */
function srcChip(name, state, full = false) {
  const c = CONN_STATE[state] || CONN_STATE.offline;
  return (
    `<span class="src-chip"${full ? ' style="grid-column:1 / -1"' : ""}>` +
    `<span class="src-chip__dot" style="background:${c.color};box-shadow:0 0 8px -1px ${c.color}"></span>` +
    `<span class="src-chip__name">${name}</span><span class="src-chip__state">${c.text}</span></span>`
  );
}

/** One detail row: label (+ sub), value (+ unit), and an optional status dot. */
function miniRow(label, sub, value, unit, color, offsite = false) {
  const dot = color ? `background:${color};box-shadow:0 0 7px -1px ${color}` : "opacity:0";
  return (
    `<li class="${offsite ? "is-offsite" : ""}">` +
    `<span class="sensor-mini__label">${label}${sub ? `<small>${sub}</small>` : ""}</span>` +
    `<span class="sensor-mini__read">${value}${unit ? `<small>${unit}</small>` : ""}</span>` +
    `<span class="sensor-mini__dot" style="${dot}"></span></li>`
  );
}

const GAS_LABEL = { CO_ppm: "CO", CO2_ppm: "CO₂", NO2_ugm3: "NO₂", O3_ugm3: "O₃", VOC_ppb: "VOC", CH4_ppm: "CH₄" };
const GAS_KEY = { CO_ppm: "co", CO2_ppm: "co2", NO2_ugm3: "no2", O3_ugm3: "o3", VOC_ppb: "voc", CH4_ppm: "ch4" };

/** Repaint the whole detail dashboard. No-ops unless the detail panel is open. */
function paintDetail() {
  const dp = $("sensorDetailPanel");
  if (!dp || !dp.classList.contains("is-open")) return;

  // Headline dashboard — overall status, head-counts and big condition tiles.
  if (lastR && lastLvl) {
    const r = lastR;
    const lvl = lastLvl;
    const status = assess(lvl);
    setDot("dpStatusDot", status.color);
    const sh = $("dpStatusHead");
    if (sh) {
      sh.textContent = status.head;
      sh.style.color = status.color;
    }
    const stx = $("dpStatusText");
    if (stx) stx.textContent = status.detail;

    setVal("dpWorkers", `${Math.round(r.workers)}`);
    setVal("dpVehicles", `${Math.round(r.vehicles)}`);

    paintReading("dpTemp", "dotDpTemp", r.temp.toFixed(1), SCALE[lvl.temp]);
    paintReading("dpHum", "dotDpHum", `${Math.round(r.humidity)}`, SCALE[lvl.humidity]);
    paintReading("dpWind", "dotDpWind", r.wind.toFixed(1), SCALE[lvl.wind]);
    paintReading("dpAqi", "dotDpAqi", `${Math.round(r.aqi)}`, SCALE[lvl.aqi]);
    const aq = $("dpAqiCat");
    if (aq) aq.textContent = AQI_LABELS[lvl.aqi];
    paintReading("dpDust", "dotDpDust", `${Math.round(r.dust)}`, SCALE[lvl.dust]);
    paintReading("dpNoise", "dotDpNoise", `${Math.round(r.noise)}`, SCALE[lvl.noise]);
    setVal("dpGasCat", VELOCITY.gas.categories[lvl.gas] || "\u2014", SCALE[lvl.gas]);
    setDot("dotDpGas", SCALE[lvl.gas]);
    const gasA = gasAssess({ co: r.co, co2: r.co2, no2: r.no2, o3: r.o3, voc: r.voc, ch4: r.ch4 });
    const gl = $("dpGasList");
    if (gl) {
      gl.textContent = gasA.drivers.length
        ? `Watching ${gasA.drivers.map((d) => d.label).join(", ")}`
        : "All six gases within limits";
    }
  }

  const sources = $("sensorSources");
  if (sources) {
    const wx = liveFresh() ? { text: "Open-Meteo", color: "#34d399" } : { text: "model", color: "#94a3b8" };
    sources.innerHTML =
      srcChip("Wind", liveStore.conn.wind) +
      srcChip("Noise", liveStore.conn.noise) +
      srcChip("Dust", liveStore.conn.dust) +
      srcChip("Gas", liveStore.conn.gas) +
      `<span class="src-chip" style="grid-column:1 / -1"><span class="src-chip__dot" style="background:${wx.color};box-shadow:0 0 8px -1px ${wx.color}"></span><span class="src-chip__name">Weather · temp / humidity / AQI</span><span class="src-chip__state">${wx.text}</span></span>`;
  }

  const wd = $("windDetail");
  if (wd) {
    const w = liveStore.wind;
    const wcol = (v) => SCALE[stepUp(v, WIND_LADDER)]; // crane-ops ladder — matches the compact wind row
    const dir = w.dir != null ? `${Math.round(w.dir)}° ${compass16(w.dir)}` : "—";
    wd.innerHTML =
      miniRow("Speed", w.category ? escHtml(w.category) : "", w.speed != null ? w.speed.toFixed(1) : "—", "m/s", w.speed != null ? wcol(w.speed) : null) +
      miniRow("Gust", "", w.gust != null ? w.gust.toFixed(1) : "—", "m/s", w.gust != null ? wcol(w.gust) : null) +
      miniRow("Direction", "from", dir, "", null) +
      miniRow("Elevation", "crane top", w.elev != null ? Math.round(w.elev) : "—", "m", null);
  }

  const nd = $("noiseDetail");
  if (nd) {
    nd.innerHTML = VELOCITY.noise.sensors
      .map((s) => {
        const r = liveStore.noise.bySensor[s.id];
        const v = r && r.v != null ? r.v : null;
        const color = v != null ? SCALE[stepUp(v, NOISE_LADDER)] : null;
        return miniRow(s.label, s.offsite ? "off-site" : "boundary", v != null ? Math.round(v) : "—", "dBA", color, s.offsite);
      })
      .join("");
  }

  const dd = $("dustDetail");
  if (dd) {
    dd.innerHTML = VELOCITY.dust.sensors
      .map((s) => {
        const r = liveStore.dust.bySensor[s.id];
        const v = r && r.v != null ? r.v : null;
        const color = v != null ? SCALE[stepUp(v, VELOCITY.dust.thresholds)] : null;
        return miniRow(s.label, "", v != null ? Math.round(v) : "—", "µg/m³", color);
      })
      .join("");
  }

  const gd = $("gasDetail");
  if (gd) {
    const g = liveStore.gas;
    gd.innerHTML = VELOCITY.gas.params
      .map((p) => {
        const v = g[GAS_KEY[p.field]];
        const glvl = v != null ? stepUp(v, p.thresholds) : 0;
        const color = v != null ? SCALE[glvl] : null;
        const shown = v == null ? "—" : v >= 100 ? Math.round(v) : v.toFixed(1);
        const sub = glvl >= 1 ? VELOCITY.gas.categories[glvl].toLowerCase() : "";
        return miniRow(GAS_LABEL[p.field], sub, shown, p.unit, color);
      })
      .join("");
  }
}

/** Refresh the site-local clock in both panels' meta lines. */
function paintClock(now = new Date()) {
  const t = `${siteParts(now).clock} local`;
  const a = $("sensorClock");
  if (a) a.textContent = t;
  const b = $("sensorClockDetail");
  if (b) b.textContent = t;
}

// --- Sensor-location map controls --------------------------------------------
// Reflect + drive velocity-live.js's 3D marker visibility. The same control
// markup lives in both panels, so we sync every copy by class (not id).
const LOC_TYPES = ["noise", "dust", "gas", "wind"];
// "all" shows every type; any single type isolates it (hides the others).
const locState = { shown: false, activeType: "all" };

/** Push the current filter to the 3D markers. */
function applyActiveType() {
  const all = locState.activeType === "all";
  for (const t of LOC_TYPES) setTypeVisible(t, all || locState.activeType === t);
}

function renderLocControls() {
  document.querySelectorAll("[data-loc-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", locState.shown ? "true" : "false");
    btn.classList.toggle("is-on", locState.shown);
    const txt = btn.querySelector(".loc-toggle__txt");
    if (txt) txt.textContent = locState.shown ? "Hide Sensor Locations" : "Show Sensor Locations";
  });
  document.querySelectorAll(".loc-chips").forEach((grp) => grp.classList.toggle("is-disabled", !locState.shown));
  document.querySelectorAll(".loc-chip").forEach((chip) => {
    const active = chip.dataset.type === locState.activeType;
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
    chip.disabled = !locState.shown;
  });
}

function wireLocationControls() {
  document.querySelectorAll("[data-loc-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      locState.shown = !locState.shown;
      setLocationsVisible(locState.shown);
      if (locState.shown) applyActiveType(); // re-assert the filter when revealing
      renderLocControls();
    })
  );
  document.querySelectorAll(".loc-chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      if (!locState.shown) return;
      locState.activeType = chip.dataset.type; // click a type = show only it; "All" = show all
      applyActiveType();
      renderLocControls();
    })
  );
  renderLocControls();
}

// --- Drag (mirrors enableDrag in audit.js) -----------------------------------
function enableDrag(panel, handle) {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return; // let the collapse button click through
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    dragging = true;
    panel.classList.add("is-dragging");
    handle.setPointerCapture?.(e.pointerId);
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    panel.style.left = `${clamp(e.clientX - offsetX, 8, window.innerWidth - w - 8)}px`;
    panel.style.top = `${clamp(e.clientY - offsetY, 8, window.innerHeight - h - 8)}px`;
  });

  window.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove("is-dragging");
    handle.releasePointerCapture?.(e.pointerId);
  });
}

/**
 * Mount + start the live sensor panel. Call once after the view boots; it
 * no-ops gracefully if the markup isn't present.
 */
export function createSensorPanel() {
  const panel = $("sensorPanel");
  if (!panel) return;

  const head = $("sensorHead");
  const collapse = $("sensorCollapse");
  if (head) enableDrag(panel, head);

  collapse?.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("is-collapsed");
    collapse.textContent = collapsed ? "+" : "–";
    collapse.setAttribute("aria-label", collapsed ? "Expand sensor panel" : "Collapse sensor panel");
  });

  // Summary ⇄ detail are two separate panels; opening one closes the other.
  const detailPanel = $("sensorDetailPanel");
  const detailHead = $("sensorDetailHead");
  if (detailPanel && detailHead) enableDrag(detailPanel, detailHead);

  const openDetail = () => {
    panel.classList.add("is-hidden");
    detailPanel?.classList.add("is-open");
    detailPanel?.setAttribute("aria-hidden", "false");
    paintDetail();
  };
  const closeDetail = () => {
    detailPanel?.classList.remove("is-open");
    detailPanel?.setAttribute("aria-hidden", "true");
    panel.classList.remove("is-hidden");
  };
  $("sensorExpand")?.addEventListener("click", openDetail);
  $("sensorDetailClose")?.addEventListener("click", closeDetail);

  // Show/hide 3D sensor markers on the map + per-type filters.
  wireLocationControls();

  const loc = $("sensorLoc");
  if (loc) loc.textContent = SITE.label;
  const locD = $("sensorLocDetail");
  if (locD) locD.textContent = SITE.label;

  loadLiveCache(); // show the last good reading immediately if it's still fresh
  paint();
  paintClock();

  // Fetch real temperature/humidity/air-quality now, then paint with it.
  fetchLive().then(paint);

  // Live cadence: sensors ease toward fresh targets every 6s (values drift
  // gradually rather than jumping); clock every 30s; live open data every 10 min.
  const readTimer = setInterval(paint, 6000);
  const clockTimer = setInterval(paintClock, 30000);
  const liveTimer = setInterval(() => fetchLive().then(paint), LIVE_REFRESH_MS);

  window.addEventListener("beforeunload", () => {
    clearInterval(readTimer);
    clearInterval(clockTimer);
    clearInterval(liveTimer);
  });

  return { refresh: paint };
}
