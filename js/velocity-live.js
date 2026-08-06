// =============================================================================
// velocity-live.js — live ArcGIS Velocity sensor network on the progress scene.
//
// Connects to the four public stored-credential proxies (noise, dust, gas,
// wind), one WebSocket each, and renders every sensor as a pulsing 3D marker +
// label on the WebScene. It also publishes a shared `liveStore` that the sensor
// panel (progress-sensors.js) reads for its headline figures — so the panel and
// the scene are driven by the same live feed.
//
// Each proxy returns the StreamServer metadata anonymously and embeds a freshly
// minted token + wss URL, so the browser connects straight to the stream with
// no login. Ground sensors (noise/dust/gas) clamp to the surface; the crane-top
// wind sensor sits at its absolute elevation.
// =============================================================================

import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Glow from "@arcgis/core/webscene/Glow.js";
import { VELOCITY, VELOCITY_WKID } from "./velocity.js";

// Public stored-credential proxies (each mints its own stream token on ?f=json).
const PROXY = {
  noise: "https://utility.arcgis.com/usrsvcs/servers/3d32f3e2b3724f5189514c1963a68157/rest/services/Noise_Sensor_Sim/StreamServer",
  dust: "https://utility.arcgis.com/usrsvcs/servers/0db03c7fb68e49bb8dd59e6250d243d0/rest/services/Dust_Sensor_Sim/StreamServer",
  gas: "https://utility.arcgis.com/usrsvcs/servers/4b1045c94f2c47c2853b0d8c4d261fe3/rest/services/Gas_Sensor_Sim/StreamServer",
  wind: "https://utility.arcgis.com/usrsvcs/servers/99d7c907a198478e9b5073d28861e65e/rest/services/Wind_Sensor_Sim/StreamServer"
};

// Ground sensors clamp to the surface; the wind sensor carries a true Z.
const FEEDS = {
  noise: { cfg: VELOCITY.noise, mode: "ground" },
  dust: { cfg: VELOCITY.dust, mode: "ground" },
  gas: { cfg: VELOCITY.gas, mode: "ground" },
  wind: { cfg: VELOCITY.wind, mode: "crane" }
};

// Four-step alert scale (matches progress-sensors.js): green → yellow → orange → red.
const SCALE_RGB = [
  [74, 222, 128],
  [250, 204, 21],
  [251, 146, 60],
  [248, 113, 113]
];
const GREY = [148, 163, 184]; // "connecting" / no-data colour

// Honour the OS "reduce motion" setting — skip the pulse and swap values instantly.
const REDUCE_MOTION =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rgba = (c, a) => [c[0], c[1], c[2], a];
const round = (v) => Math.round(v);

/** Threshold ladder: crossing t[0] → 1, t[1] → 2, t[2] → 3. */
const stepUp = (v, t) => (v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0);

// Short display labels for the gas parameters (config carries only keys).
const GAS_LABELS = { co: "CO", co2: "CO₂", no2: "NO₂", o3: "O₃", voc: "VOC", ch4: "CH₄" };

/**
 * Grade a bag of gas readings against each gas's own threshold ladder. Returns
 * the overall band plus the "drivers" — the gases at or above their watch
 * threshold, worst first — so every surface can name *which* gases to watch,
 * not merely that something is elevated.
 */
export function gasAssess(values) {
  let level = 0;
  const drivers = [];
  for (const p of VELOCITY.gas.params) {
    const v = values[p.key];
    if (v == null) continue;
    const lvl = stepUp(v, p.thresholds);
    if (lvl > level) level = lvl;
    if (lvl >= 1) drivers.push({ key: p.key, label: GAS_LABELS[p.key] || p.key, level: lvl });
  }
  drivers.sort((a, b) => b.level - a.level);
  return { level, drivers };
}

/** Compact floating-label text: the category word, plus which gases drive it. */
function gasLabelText(cat, drivers) {
  if (!drivers || !drivers.length) return cat || "Normal";
  return `${cat}: ${drivers.map((d) => d.label).join(", ")}`;
}

// -----------------------------------------------------------------------------
// Shared live store — the panel reads this; the scene writes it.
// -----------------------------------------------------------------------------
export const liveStore = {
  conn: { noise: "connecting", dust: "connecting", gas: "connecting", wind: "connecting" },
  // Rollups + freshness the panel uses for its headline numbers.
  noise: { ts: 0, laeq: null, category: null, level: 0, bySensor: {} },
  dust: { ts: 0, pm10: null, category: null, level: 0, bySensor: {} },
  gas: { ts: 0, category: null, level: 0, drivers: [], co: null, co2: null, no2: null, o3: null, voc: null, ch4: null },
  wind: { ts: 0, speed: null, gust: null, dir: null, elev: null, category: null, level: 0 }
};

// On-site sensor id sets (rollups ignore off-site receptors).
const ONSITE = {
  noise: new Set(VELOCITY.noise.sensors.filter((s) => !s.offsite).map((s) => s.id)),
  dust: new Set(VELOCITY.dust.sensors.filter((s) => !s.offsite).map((s) => s.id))
};

/** Recompute a feed's on-site MAX rollup from its per-sensor readings. */
function recomputeMax(feedKey, thresholds) {
  const feed = liveStore[feedKey];
  let max = null;
  let maxCat = null;
  for (const id of Object.keys(feed.bySensor)) {
    if (!ONSITE[feedKey].has(id)) continue;
    const r = feed.bySensor[id];
    if (r.v == null) continue;
    if (max == null || r.v > max) {
      max = r.v;
      maxCat = r.category ?? null;
    }
  }
  if (feedKey === "noise") feed.laeq = max;
  else if (feedKey === "dust") feed.pm10 = max;
  feed.category = maxCat;
  feed.level = max == null ? 0 : stepUp(max, thresholds);
  feed.ts = Date.now();
}

// -----------------------------------------------------------------------------
// 3D symbols
// -----------------------------------------------------------------------------
// The "glow" uses the SDK's dedicated symbology rather than a scene-wide bloom:
// an *emissive* material makes the sphere emit its own colour, and the scene's
// `Glow` lighting setting (enabled once in createVelocityLive) blooms that
// emission into visible light. Because only emissive surfaces glow, the BIM
// model stays untouched. `source: "color"` emits in each orb's category colour.
// One small sphere per sensor — the SDK glow gives it its halo of light, so no
// second "halo" sphere is needed; the orb's own opacity breathes the pulse.
const ORB_EMISSIVE = 2; // sphere emission strength (≥0, tunable)

// Small emissive sphere sitting at the sensor spot — the sensor itself.
function orbSymbol(rgb) {
  return {
    type: "point-3d",
    symbolLayers: [
      {
        type: "object",
        resource: { primitive: "sphere" },
        material: { color: rgb, emissive: { strength: ORB_EMISSIVE, source: "color" } },
        anchor: "bottom",
        width: 6,
        depth: 6,
        height: 6
      }
    ]
  };
}

function labelSymbol(text, rgb) {
  return {
    type: "point-3d",
    symbolLayers: [
      {
        type: "text",
        text,
        material: { color: "#ffffff" },
        halo: { color: rgba([4, 8, 20], 0.85), size: 1.1 },
        size: 11.5,
        font: { weight: "bold", family: "Inter, system-ui, sans-serif" }
      }
    ],
    // Float the reading above the cone with a thin leader line — world-anchored
    // (minWorldLength) so it stays clear of the 3D marker at any zoom.
    verticalOffset: { screenLength: 22, minWorldLength: 16 },
    callout: { type: "line", size: 1.1, color: rgba(rgb, 0.85), border: { color: rgba([4, 8, 20], 0.6) } }
  };
}

function pointGeom(x, y, z) {
  return { type: "point", x, y, z, spatialReference: { wkid: VELOCITY_WKID } };
}

// -----------------------------------------------------------------------------
// Layers + per-sensor records
// -----------------------------------------------------------------------------
// Two layer pairs: ground sensors clamp to the surface, the crane sensor is
// pinned to its absolute Z. Both label layers share one pulse.
const layers = {}; // mode → { cones, labels }
const orbLayers = [];
const labelLayers = [];
const records = new Map(); // sensorId → record
const graphicToRec = new Map(); // any sensor graphic → its record (click-to-inspect)

// Anonymised, non-identifying names for the click popup — never the real site /
// neighbour labels, which could point to a specific property.
const TYPE_LABEL = { noise: "Noise sensor", dust: "Dust sensor", gas: "Gas monitor", wind: "Wind sensor" };

// Visibility state — markers hidden until the user asks; each type filterable.
let locationsVisible = false;
const typeVisible = { noise: true, dust: true, gas: true, wind: true };

function ensureLayers(scene) {
  const modes = {
    ground: { mode: "on-the-ground" },
    crane: { mode: "absolute-height" }
  };
  for (const [name, elevationInfo] of Object.entries(modes)) {
    const cones = new GraphicsLayer({ id: `velCones-${name}`, title: "Live sensors (Velocity)", elevationInfo, visible: false });
    const labels = new GraphicsLayer({ id: `velLabels-${name}`, title: "Live sensor labels (Velocity)", elevationInfo, visible: false });
    layers[name] = { cones, labels };
    orbLayers.push(cones);
    labelLayers.push(labels);
    scene.addMany([cones, labels]);
  }
}

// Scene-level glow (0–1): how strongly the SDK blooms emissive surfaces. Set
// once on the view's sun lighting, so only the emissive sensor orbs glow.
const SCENE_GLOW = 0.7;

/** Turn on the scene's Glow so the emissive orb material actually blooms. */
function enableSceneGlow(view) {
  const lighting = view?.environment?.lighting;
  if (lighting) lighting.glow = new Glow({ intensity: clamp(SCENE_GLOW, 0, 1) });
}

function buildRecords() {
  for (const [feedKey, feed] of Object.entries(FEEDS)) {
    const multi = feed.cfg.sensors.length > 1;
    let n = 0;
    for (const s of feed.cfg.sensors) {
      n += 1;
      const z = s.z ?? feed.cfg.elevation ?? 0;
      const g = pointGeom(s.x, s.y, z);
      const coneG = new Graphic({ geometry: g, symbol: orbSymbol(GREY) });
      const labelG = new Graphic({ geometry: g, symbol: labelSymbol("…", GREY) });
      layers[feed.mode].cones.add(coneG);
      layers[feed.mode].labels.add(labelG);
      const rec = {
        feed: feedKey,
        id: s.id,
        displayName: multi ? `${TYPE_LABEL[feedKey]} ${n}` : TYPE_LABEL[feedKey],
        offsite: !!s.offsite,
        coneG,
        labelG,
        shownText: null,
        shownLvl: -1,
        shownNum: null,
        pending: null
      };
      records.set(s.id, rec);
      // Either of the sensor's graphics resolves back to it on a hitTest.
      graphicToRec.set(coneG, rec);
      graphicToRec.set(labelG, rec);
    }
  }
}

// -----------------------------------------------------------------------------
// Gentle synchronised pulse — every orb and label breathes together, and value
// changes are applied at the dim trough of the breath so a new reading is never
// seen to "pop" in. The orb's opacity breathes, so its emitted glow pulses too.
// -----------------------------------------------------------------------------
const LABEL_MIN = 0.5; // labels dim but never fully vanish
const LABEL_MAX = 1.0;
const ORB_MIN = 0.55; // orb dims but stays solid so its glow gently breathes
const ORB_MAX = 1.0;
const PULSE_PERIOD = 2800; // ms per full out→in cycle
let pulseAnim = 0;
let pulsePhase = Math.PI / 2; // start near the bright peak
let pulseLast = 0;
let flushedThisTrough = false;

/** Apply one sensor's queued text/colour to its graphics. */
function applyRecord(rec, text, rgb, lvl, numVal) {
  rec.labelG.symbol = labelSymbol(text, rgb);
  if (lvl !== rec.shownLvl) {
    rec.coneG.symbol = orbSymbol(rgb);
  }
  rec.shownText = text;
  rec.shownLvl = lvl;
  if (numVal != null) rec.shownNum = numVal;
  rec.pending = null;
}

/** Flush every sensor's queued change (called at the pulse trough). */
function flushPending() {
  for (const rec of records.values()) {
    if (rec.pending) applyRecord(rec, rec.pending.text, rec.pending.rgb, rec.pending.lvl, rec.pending.num);
  }
}

function pulseTick(now) {
  if (!labelLayers.length) return;
  const dt = pulseLast ? now - pulseLast : 16;
  pulseLast = now;
  pulsePhase += (dt / PULSE_PERIOD) * Math.PI * 2;
  const s = 0.5 + 0.5 * Math.sin(pulsePhase); // 0 (trough) → 1 (peak)
  const labelOp = LABEL_MIN + (LABEL_MAX - LABEL_MIN) * s;
  const orbOp = ORB_MIN + (ORB_MAX - ORB_MIN) * s;
  for (const l of labelLayers) l.opacity = labelOp;
  for (const l of orbLayers) l.opacity = orbOp;

  // Once per breath, at the dim trough, reveal any queued value changes.
  if (s <= 0.05) {
    if (!flushedThisTrough) {
      flushPending();
      flushedThisTrough = true;
    }
  } else if (s >= 0.5) {
    flushedThisTrough = false;
  }
  pulseAnim = requestAnimationFrame(pulseTick);
}

function startPulse() {
  if (REDUCE_MOTION || typeof requestAnimationFrame !== "function") {
    for (const l of labelLayers) l.opacity = 1;
    for (const l of orbLayers) l.opacity = 1;
    return;
  }
  cancelAnimationFrame(pulseAnim);
  pulseLast = 0;
  pulseAnim = requestAnimationFrame(pulseTick);
}

// -----------------------------------------------------------------------------
// Visibility controls — markers stay hidden until the user asks for them, and
// each sensor type can be toggled independently (labels overlap when close).
// -----------------------------------------------------------------------------
export function setLocationsVisible(v) {
  locationsVisible = !!v;
  for (const grp of Object.values(layers)) {
    grp.cones.visible = locationsVisible;
    grp.labels.visible = locationsVisible;
  }
  if (locationsVisible) startPulse();
  else cancelAnimationFrame(pulseAnim);
}

export function setTypeVisible(type, v) {
  if (!(type in typeVisible)) return;
  typeVisible[type] = !!v;
  for (const rec of records.values()) {
    if (rec.feed !== type) continue;
    rec.coneG.visible = typeVisible[type];
    rec.labelG.visible = typeVisible[type];
  }
}

export function getVisibilityState() {
  return { locationsVisible, typeVisible: { ...typeVisible } };
}

// -----------------------------------------------------------------------------
// Click-to-inspect popup — a live, anonymised reading card for one sensor. The
// scene keeps default Esri popups off, so progress-interaction.js calls these
// on a click hitTest and we render our own glass card (never a real sensor id).
// -----------------------------------------------------------------------------
const COMPASS16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const compass16 = (deg) => (deg == null ? "—" : COMPASS16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]);

function fmtClock(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "—";
  }
}

/** Current live reading for a sensor record, as popup-ready fields. */
function readSensor(rec) {
  if (rec.feed === "wind") {
    const w = liveStore.wind;
    return {
      lvl: w.level ?? 0,
      cat: w.category,
      ts: w.ts,
      hero: w.speed == null ? "—" : `${round(w.speed)}`,
      unit: "m/s",
      rows: [
        ["Gust", w.gust == null ? "—" : `${round(w.gust)} m/s`],
        ["Direction", w.dir == null ? "—" : `${compass16(w.dir)} · ${round(w.dir)}°`],
        ["Elevation", w.elev == null ? "—" : `${round(w.elev)} m`]
      ]
    };
  }
  if (rec.feed === "gas") {
    const g = liveStore.gas;
    const drivers = g.drivers || [];
    const lvlByKey = {};
    for (const d of drivers) lvlByKey[d.key] = d.level;
    const q = (v, u) => (v == null ? "—" : `${v} ${u}`);
    const rc = (key) => (lvlByKey[key] ? `rgb(${SCALE_RGB[lvlByKey[key]].join(", ")})` : null);
    return {
      lvl: g.level ?? 0,
      cat: g.category,
      ts: g.ts,
      hero: g.category || "—",
      unit: "",
      note: drivers.length
        ? `Watching ${drivers.map((d) => d.label).join(", ")}`
        : "All six gases within limits",
      rows: [
        ["CO", q(g.co, "ppm"), rc("co")],
        ["CO₂", q(g.co2, "ppm"), rc("co2")],
        ["NO₂", q(g.no2, "µg/m³"), rc("no2")],
        ["O₃", q(g.o3, "µg/m³"), rc("o3")],
        ["VOC", q(g.voc, "ppb"), rc("voc")],
        ["CH₄", q(g.ch4, "ppm"), rc("ch4")]
      ]
    };
  }
  // noise / dust — the value lives per-sensor in bySensor.
  const s = liveStore[rec.feed].bySensor[rec.id] || {};
  const thr = VELOCITY[rec.feed].thresholds;
  const unit = rec.feed === "noise" ? "dBA" : "µg/m³";
  return {
    lvl: s.v == null ? 0 : stepUp(s.v, thr),
    cat: s.category,
    ts: s.ts,
    hero: s.v == null ? "—" : `${round(s.v)}`,
    unit,
    rows: [
      ["Placement", rec.offsite ? "Off-site receptor" : "Site boundary"],
      ["Caution above", `${thr[0]} ${unit}`],
      ["Alert scale", `${thr[0]} · ${thr[1]} · ${thr[2]}`]
    ]
  };
}

let popEl = null;
let popRec = null;
let popTimer = 0;

function ensurePopup() {
  if (popEl || typeof document === "undefined") return popEl;
  popEl = document.createElement("div");
  popEl.id = "sensorPopup";
  popEl.className = "sensor-pop glass";
  popEl.setAttribute("role", "dialog");
  popEl.setAttribute("aria-hidden", "true");
  popEl.addEventListener("click", (e) => {
    if (e.target.closest(".sensor-pop__close")) closeSensorPopup();
  });
  document.body.appendChild(popEl);
  return popEl;
}

function renderPopup() {
  if (!popEl || !popRec) return;
  const r = readSensor(popRec);
  const rgb = SCALE_RGB[clamp(r.lvl ?? 0, 0, 3)];
  const color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const rows = r.rows.map(([k, v, c]) => `<li><span>${k}</span><b${c ? ` style="color:${c}"` : ""}>${v}</b></li>`).join("");
  const unit = r.unit ? `<span class="sensor-pop__unit">${r.unit}</span>` : "";
  const note = r.note ? `<div class="sensor-pop__note" style="color:${color}">${r.note}</div>` : "";
  popEl.innerHTML =
    '<button class="sensor-pop__close" aria-label="Close">×</button>' +
    '<div class="sensor-pop__tag">Live sensor</div>' +
    `<div class="sensor-pop__name">${popRec.displayName}</div>` +
    `<div class="sensor-pop__status"><span class="sensor-pop__dot" style="background:${color}; box-shadow:0 0 9px ${color}"></span>` +
    `<span class="sensor-pop__cat" style="color:${color}">${r.cat || "—"}</span></div>` +
    `<div class="sensor-pop__hero"><strong>${r.hero}</strong>${unit}</div>` +
    note +
    `<ul class="sensor-pop__rows">${rows}</ul>` +
    `<div class="sensor-pop__foot">As of ${fmtClock(r.ts)} · ArcGIS Velocity</div>`;
}

function placePopup(x, y) {
  if (!popEl) return;
  const pad = 16;
  const rect = popEl.getBoundingClientRect();
  const w = rect.width || 226;
  const h = rect.height || 210;
  const left = x + pad + w > window.innerWidth ? x - w - pad : x + pad;
  const top = y + pad + h > window.innerHeight ? y - h - pad : y + pad;
  popEl.style.left = `${Math.max(pad, left)}px`;
  popEl.style.top = `${Math.max(pad, top)}px`;
}

/** Open the live card for a sensor graphic; false if it isn't a sensor. */
export function openSensorPopupForGraphic(graphic, x, y) {
  const rec = graphic && graphicToRec.get(graphic);
  if (!rec) return false;
  ensurePopup();
  popRec = rec;
  renderPopup();
  popEl.classList.add("is-visible");
  popEl.setAttribute("aria-hidden", "false");
  placePopup(x, y);
  clearInterval(popTimer);
  popTimer = setInterval(renderPopup, 1000); // keep the reading live while open
  return true;
}

export function closeSensorPopup() {
  clearInterval(popTimer);
  popTimer = 0;
  popRec = null;
  if (popEl) {
    popEl.classList.remove("is-visible");
    popEl.setAttribute("aria-hidden", "true");
  }
}

/** Queue a sensor update; the pulse loop reveals it at the next trough. */
function setSensor(rec, text, rgb, lvl, numVal) {
  // First real reading (or reduced motion): show it straight away.
  if (rec.shownText == null || REDUCE_MOTION) {
    applyRecord(rec, text, rgb, lvl, numVal);
    return;
  }
  // Hysteresis: ignore sub-unit numeric jitter when the alert level is unchanged.
  if (numVal != null && lvl === rec.shownLvl && rec.shownNum != null && Math.abs(numVal - rec.shownNum) < 0.6) return;
  if (text === rec.shownText && lvl === rec.shownLvl) return;
  rec.pending = { text, rgb, lvl, num: numVal };
}

// -----------------------------------------------------------------------------
// Per-feed message handlers — update the store and return the marker update.
// -----------------------------------------------------------------------------
function onWind(a) {
  const speed = num(a.WindSpeed_ms);
  if (speed == null) return null;
  const lvl = stepUp(speed, VELOCITY.wind.thresholds);
  Object.assign(liveStore.wind, {
    speed,
    gust: num(a.WindGust_ms),
    dir: num(a.WindDir_deg),
    elev: num(a.Elevation),
    category: a.WindCategory ?? null,
    level: lvl,
    ts: Date.now()
  });
  return { id: a.SensorID, level: lvl, text: `${round(speed)} m/s`, num: speed };
}

function onNoise(a) {
  const v = num(a.LAeq_dBA);
  if (v == null) return null;
  const id = a.SensorID;
  (liveStore.noise.bySensor[id] ||= {}).v = v;
  liveStore.noise.bySensor[id].category = a.NoiseCategory ?? null;
  liveStore.noise.bySensor[id].ts = Date.now();
  recomputeMax("noise", VELOCITY.noise.thresholds);
  const lvl = stepUp(v, VELOCITY.noise.thresholds);
  return { id, level: lvl, text: `${round(v)} dBA`, num: v };
}

function onDust(a) {
  const v = num(a.PM10_ugm3);
  if (v == null) return null;
  const id = a.SensorID;
  (liveStore.dust.bySensor[id] ||= {}).v = v;
  liveStore.dust.bySensor[id].category = a.DustCategory ?? null;
  liveStore.dust.bySensor[id].ts = Date.now();
  recomputeMax("dust", VELOCITY.dust.thresholds);
  const lvl = stepUp(v, VELOCITY.dust.thresholds);
  return { id, level: lvl, text: `${round(v)} µg/m³`, num: v };
}

function onGas(a) {
  const values = {
    co: num(a.CO_ppm),
    co2: num(a.CO2_ppm),
    no2: num(a.NO2_ugm3),
    o3: num(a.O3_ugm3),
    voc: num(a.VOC_ppb),
    ch4: num(a.CH4_ppm)
  };
  // Grade from the readings themselves so the category word, the colour and the
  // named drivers always agree — if it says Watch, the drivers say which gas.
  const { level, drivers } = gasAssess(values);
  const cat = VELOCITY.gas.categories[level] ?? a.GasCategory ?? null;
  Object.assign(liveStore.gas, { category: cat, level, drivers, ...values, ts: Date.now() });
  return { id: a.SensorID, level, text: gasLabelText(cat, drivers), num: null };
}

const HANDLERS = { noise: onNoise, dust: onDust, gas: onGas, wind: onWind };

/** Route an incoming feature to its store update + marker. */
function ingest(feedKey, msg) {
  const a = msg.attributes;
  if (!a) return;
  const parsed = HANDLERS[feedKey](a);
  if (!parsed) return;
  const rec = records.get(parsed.id);
  if (rec) setSensor(rec, parsed.text, SCALE_RGB[parsed.level], parsed.level, parsed.num);
}

// -----------------------------------------------------------------------------
// WebSocket connections — one per feed, via the stored-credential proxy.
// -----------------------------------------------------------------------------
const conns = {}; // feedKey → { ws, reconnectTimer, refreshTimer }
let stopped = false;

function setConn(feedKey, state) {
  liveStore.conn[feedKey] = state;
}

async function connectFeed(feedKey) {
  if (stopped) return;
  setConn(feedKey, "connecting");
  const slot = (conns[feedKey] ||= {});
  try {
    const res = await fetch(`${PROXY[feedKey]}?f=json`, { cache: "no-store" });
    const meta = await res.json();
    if (meta?.error) throw new Error(`${meta.error.code}: ${meta.error.message}`);
    const su = meta?.streamUrls?.[0];
    const wss = su?.urls?.[0];
    const token = su?.token;
    if (!wss || !token) throw new Error("proxy returned no stream url/token");

    const url = `${wss}/subscribe?token=${encodeURIComponent(token)}&outSR=${VELOCITY_WKID}`;
    const ws = new WebSocket(url);
    slot.ws = ws;

    ws.onopen = () => {
      if (stopped) return;
      setConn(feedKey, "streaming");
      // Proactively refresh the token/connection well before it can expire.
      clearTimeout(slot.refreshTimer);
      slot.refreshTimer = setTimeout(() => reconnectFeed(feedKey, "refresh"), 50 * 60 * 1000);
    };
    ws.onmessage = (ev) => {
      let d;
      try {
        d = JSON.parse(ev.data);
      } catch {
        return; // ignore keep-alives / non-JSON frames
      }
      if (d && d.attributes) ingest(feedKey, d);
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* already closing */
      }
    };
    ws.onclose = () => {
      if (!stopped) scheduleReconnect(feedKey);
    };
  } catch (err) {
    console.warn(`[VELOCITY] ${feedKey} connect failed:`, err?.message ?? err);
    setConn(feedKey, "offline");
    scheduleReconnect(feedKey);
  }
}

function scheduleReconnect(feedKey) {
  if (stopped) return;
  setConn(feedKey, "reconnecting");
  const slot = (conns[feedKey] ||= {});
  clearTimeout(slot.reconnectTimer);
  // Small jitter so four feeds don't all retry in lockstep.
  slot.reconnectTimer = setTimeout(() => connectFeed(feedKey), 3000 + Math.random() * 1500);
}

function reconnectFeed(feedKey, reason) {
  const slot = conns[feedKey];
  try {
    slot?.ws?.close();
  } catch {
    /* noop */
  }
  console.info(`[VELOCITY] ${feedKey} reconnecting (${reason})`);
  connectFeed(feedKey);
}

function cleanup() {
  stopped = true;
  cancelAnimationFrame(pulseAnim);
  for (const slot of Object.values(conns)) {
    clearTimeout(slot.reconnectTimer);
    clearTimeout(slot.refreshTimer);
    try {
      slot.ws?.close();
    } catch {
      /* noop */
    }
  }
}

// -----------------------------------------------------------------------------
// Public entry
// -----------------------------------------------------------------------------
/**
 * Stand up the live Velocity sensor network: pulsing 3D markers for every
 * sensor + a shared `liveStore` for the panel. Safe to call once after the
 * view is ready; no-ops gracefully if the scene isn't available.
 */
export function createVelocityLive({ scene, view } = {}) {
  if (!scene) {
    console.warn("[VELOCITY] no scene — skipping");
    return null;
  }
  try {
    ensureLayers(scene);
    enableSceneGlow(view);
    buildRecords();
    // Markers start hidden; the panel's "Show on map" toggle calls
    // setLocationsVisible(true), which reveals the layers and starts the pulse.
    for (const feedKey of Object.keys(FEEDS)) connectFeed(feedKey);
    window.addEventListener("beforeunload", cleanup);

    return {
      store: liveStore,
      // Optional: frame a sensor by id (kept non-intrusive).
      focus: (id) => {
        const rec = records.get(id);
        const g = rec?.coneG?.geometry;
        if (g && view) view.goTo({ target: g, tilt: 68, zoom: 17 }, { duration: 1400 }).catch(() => {});
      }
    };
  } catch (err) {
    console.warn("[VELOCITY] init failed:", err?.message ?? err);
    return null;
  }
}
