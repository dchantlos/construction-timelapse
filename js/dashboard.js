// =============================================================================
// dashboard.js — translates the TimeSlider position into live analytics
// =============================================================================

import { BUILDING_LAYERS, PHASES } from "./config.js";

const RING_CIRCUMFERENCE = 327; // 2π·52 to match the SVG radius in styles.css
const DAY_MS = 1000 * 60 * 60 * 24;

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

  // Build the static layer rows once; we only toggle their state on update.
  const layerRows = BUILDING_LAYERS.map((layer) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="swatch" style="background:${layer.color};box-shadow:0 0 10px ${layer.color}"></span>
      <span class="layer-name">${layer.label}</span>
      <span class="layer-state">Pending</span>`;

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
    return { layer, li, state: li.querySelector(".layer-state") };
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

    // Active construction layers: any layer whose start threshold has passed.
    let active = 0;
    for (const row of layerRows) {
      const isActive = progress >= row.layer.startAt;
      if (isActive) active += 1;
      row.li.classList.toggle("is-active", isActive);
      row.state.textContent = isActive
        ? progress >= row.layer.startAt + 0.15
          ? "Complete"
          : "In progress"
        : "Pending";
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
