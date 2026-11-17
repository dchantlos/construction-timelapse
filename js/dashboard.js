// =============================================================================
// dashboard.js — translates the TimeSlider position into live analytics
// =============================================================================

import { BUILDING_LAYERS, PHASES, PROJECT } from "./config.js?v=15";

const RING_CIRCUMFERENCE = 327; // 2π·52 to match the SVG radius in styles.css
const DAY_MS = 1000 * 60 * 60 * 24;

// Layers with authored `timing` (the tower) rise floor-by-floor, offset by their
// place in the sequence. Layers without it (the roadway) follow their own
// schedule: the share of elements whose Sched_StartDate has passed, i.e. what
// the cumulative timeline is showing (see loadBuildCurves).
const DEFAULT_TIMING = { lead: 0, end: 1 };
const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** Count of sorted values ≤ x (binary search). */
function countAtOrBefore(sorted, x) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Read each untimed building layer's scheduled start dates from its I3S
 * statistics (every value with its count), as a sorted list of epoch ms.
 * Layers whose statistics are missing or partial are simply left out.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 * @param {string} [field="Sched_StartDate"]
 * @returns {Promise<Map<string, number[]>>} layer id → sorted start times
 */
export async function loadBuildCurves(scene, field = "Sched_StartDate") {
  const untimed = new Set(BUILDING_LAYERS.filter((l) => !l.timing).map((l) => l.id));
  const curves = new Map();
  const layers = scene.allLayers
    .filter((layer) => layer.type === "scene" && untimed.has(layer.title))
    .toArray();
  await Promise.all(
    layers.map(async (layer) => {
      try {
        const doc = await layer.queryCachedStatistics(field);
        const stats = doc?.stats ?? doc ?? {};
        const starts = [];
        for (const { value, count } of stats.mostFrequentValues ?? []) {
          const ms = Date.parse(value);
          if (Number.isFinite(ms)) for (let i = 0; i < Number(count || 0); i++) starts.push(ms);
        }
        const total = Number(stats.totalValuesCount ?? stats.count ?? starts.length);
        if (starts.length && starts.length >= total) {
          curves.set(layer.title, starts.sort((a, b) => a - b));
        }
      } catch (err) {
        console.warn(`Build curve unavailable for ${layer.title}`, err);
      }
    })
  );
  return curves;
}

/**
 * Wire up DOM references once and return an `update(timeExtent, fullExtent)`
 * function the caller invokes whenever the TimeSlider moves.
 */
export function createDashboard(options = {}) {
  const { onLayerClick } = options;

  const el = {
    date: document.getElementById("dashDate"),
    ringBar: document.getElementById("ringBar"),
    progressPct: document.getElementById("progressPct"),
    currentPhase: document.getElementById("currentPhase"),
    activeLayerCount: document.getElementById("activeLayerCount"),
    elapsedDays: document.getElementById("elapsedDays"),
    remainingDays: document.getElementById("remainingDays"),
    layerList: document.getElementById("layerList"),
    cineProgress: document.getElementById("cineProgress")
  };

  // Build the trade rows once (timed layers sorted so the fills cascade in
  // build order; untimed ones keep their configured order); we only update
  // each bar's width on tick.
  const timed = BUILDING_LAYERS.every((layer) => layer.timing);
  const orderedLayers = timed
    ? [...BUILDING_LAYERS].sort((a, b) => a.timing.lead - b.timing.lead)
    : [...BUILDING_LAYERS];
  // Long lists switch to one-line rows so the whole dashboard fits.
  el.layerList.classList.toggle("layer-list--compact", orderedLayers.length > 8);
  const layerRows = orderedLayers.map((layer) => {
    const li = document.createElement("li");
    li.style.setProperty("--layer-c", layer.color);
    li.innerHTML = `
      <span class="swatch" style="background:${layer.color};box-shadow:0 0 8px ${layer.color}"></span>
      <span class="layer-name">${layer.label}</span>
      <span class="layer-pct">0%</span>
      <span class="layer-bar"><span class="layer-bar__fill"></span></span>`;

    // Clicking a row isolates that layer in the 3D scene (ghosting the rest).
    if (onLayerClick) {
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.title = `Isolate ${layer.label}`;
      const fire = () => onLayerClick(layer.id);
      li.addEventListener("click", fire);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fire();
        }
      });
    }

    el.layerList.appendChild(li);
    return {
      layer,
      li,
      timing: layer.timing ?? DEFAULT_TIMING,
      curve: null, // sorted element start times, once loadBuildCurves() lands
      fill: li.querySelector(".layer-bar__fill"),
      pctEl: li.querySelector(".layer-pct")
    };
  });

  const fmtDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: PROJECT.timeZone
  });

  /**
   * @param {import("@arcgis/core/time/TimeExtent").default} extent current slider extent
   * @param {import("@arcgis/core/time/TimeExtent").default} full full time extent
   */
  function update(extent, full) {
    if (!extent?.end || !full?.start || !full?.end) return;

    const total = full.end - full.start;
    const elapsed = Math.max(0, Math.min(total, extent.end - full.start));
    const progress = total > 0 ? elapsed / total : 0;
    const pct = Math.round(progress * 100);

    // Headline date + progress ring
    el.date.textContent = fmtDate.format(extent.end);
    el.progressPct.textContent = `${pct}%`;
    el.ringBar.style.strokeDashoffset = String(
      RING_CIRCUMFERENCE * (1 - progress)
    );

    // Micro-progress bar on the floating Play button.
    if (el.cineProgress) el.cineProgress.style.width = `${pct}%`;

    // Current phase from the progress → phase mapping
    el.currentPhase.textContent =
      PHASES.find((p) => progress < p.until)?.name ?? PHASES.at(-1).name;

    // Elapsed / remaining day counters
    el.elapsedDays.textContent = `${Math.round(elapsed / DAY_MS)}d`;
    el.remainingDays.textContent = `${Math.round((total - elapsed) / DAY_MS)}d`;

    // Per-trade progress: timed trades rise floor-by-floor, offset by their
    // build order, so all trades advance together (cascading) instead of one
    // finishing before the next starts; scheduled ones read their own element
    // start dates. `active` counts the trades currently under construction.
    let active = 0;
    const now = +extent.end;
    for (const row of layerRows) {
      let p;
      if (row.curve) {
        p = countAtOrBefore(row.curve, now) / row.curve.length;
      } else {
        const span = row.timing.end - row.timing.lead;
        p = clamp01(span > 0 ? (progress - row.timing.lead) / span : 0);
      }
      const building = p > 0 && p < 0.999;
      if (building) active += 1;
      row.fill.style.width = `${(p * 100).toFixed(1)}%`;
      row.pctEl.textContent = `${Math.round(p * 100)}%`;
      row.li.classList.toggle("is-building", building);
      row.li.classList.toggle("is-complete", p >= 0.999);
    }
    el.activeLayerCount.textContent = String(active);
  }

  /** Highlight the row whose layer is isolated (or clear all when null). */
  function setIsolated(layerId) {
    for (const row of layerRows) {
      row.li.classList.toggle(
        "is-isolated",
        layerId != null && row.layer.id === layerId
      );
    }
  }

  /** Adopt build curves from loadBuildCurves() (layer id → sorted start times). */
  function setCurves(curves) {
    for (const row of layerRows) row.curve = curves.get(row.layer.id) ?? row.curve;
  }

  return { update, setIsolated, setCurves };
}
