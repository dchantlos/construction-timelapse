// =============================================================================
// dashboard.js — translates the TimeSlider position into live analytics
// =============================================================================

import { BUILDING_LAYERS, PHASES } from "./config.js";

const RING_CIRCUMFERENCE = 327; // 2π·52 to match the SVG radius in styles.css
const DAY_MS = 1000 * 60 * 60 * 24;

// Floor-by-floor build: each trade rises with the building but is offset by its
// place in the sequence, so structure leads, envelope follows, cladding lags and
// the roof trails to the top — no trade finishes before the ones beneath it.
const BUILD_TIMING = {
  Slabs: { lead: 0.0, end: 0.9 },
  Columns: { lead: 0.03, end: 0.9 },
  "Structural Framing": { lead: 0.05, end: 0.92 },
  Walls: { lead: 0.15, end: 0.95 },
  Plates: { lead: 0.18, end: 0.95 },
  "Curtain Wall Panels": { lead: 0.3, end: 1.0 },
  Roofs: { lead: 0.7, end: 1.0 }
};
const DEFAULT_TIMING = { lead: 0, end: 1 };
const clamp01 = (n) => Math.min(1, Math.max(0, n));

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

  // Build the trade rows once (sorted so the fills cascade in build order); we
  // only update each bar's width on tick.
  const orderedLayers = [...BUILDING_LAYERS].sort(
    (a, b) =>
      (BUILD_TIMING[a.id] ?? DEFAULT_TIMING).lead -
      (BUILD_TIMING[b.id] ?? DEFAULT_TIMING).lead
  );
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
      timing: BUILD_TIMING[layer.id] ?? DEFAULT_TIMING,
      fill: li.querySelector(".layer-bar__fill"),
      pctEl: li.querySelector(".layer-pct")
    };
  });

  const fmtDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
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

    // Per-trade progress: each rises floor-by-floor, offset by its build order,
    // so all trades advance together (cascading) instead of one finishing before
    // the next starts. `active` counts the trades currently under construction.
    let active = 0;
    for (const row of layerRows) {
      const span = row.timing.end - row.timing.lead;
      const p = clamp01(span > 0 ? (progress - row.timing.lead) / span : 0);
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

  return { update, setIsolated };
}
