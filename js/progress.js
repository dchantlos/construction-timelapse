// =============================================================================
// progress.js — entry point for the "Current Construction Progress" view.
//
// Opens the status-rendered WebScene (no timeline) and reports the real build
// progress against the planned schedule: where the plan says we should be vs.
// how many components have actually slipped behind.
// =============================================================================

import { createView } from "./scene.js?v=12";
import { createLayerVisibility } from "./visibility.js?v=12";
import { createSpin } from "./spin.js?v=12";
import { collectConstructionStatus } from "./progress-stats.js?v=13";
import { renderProgressPanel } from "./progress-panel.js?v=13";
import { createProgressLayers } from "./progress-layers.js?v=14";
import { createProgressInteraction } from "./progress-interaction.js?v=18";
import { createSlice } from "./slice.js?v=12";
import { renderFinancialPanel, createFinancialControls } from "./progress-financial.js?v=15";
import { createCostOverlays } from "./progress-overlays.js?v=15";
import { createSensorPanel } from "./progress-sensors.js?v=15";
import { createVelocityLive } from "./velocity-live.js?v=7";
import { PROGRESS_WEBSCENE_ID } from "./config.js?v=13";
import { installAiBridge } from "./ai-bridge.js?v=3";

/** Surface any error directly on the boot veil so failures are never silent. */
function showBootError(message) {
  const veil = document.getElementById("boot");
  const text = veil?.querySelector(".boot__text");
  const pulse = veil?.querySelector(".boot__pulse");
  if (text) text.textContent = message;
  if (pulse) pulse.style.borderColor = "#fb7185";
  console.error("[PROGRESS]", message);
}

window.addEventListener("error", (e) =>
  showBootError(`Script error: ${e.message}`)
);
window.addEventListener("unhandledrejection", (e) =>
  showBootError(`Load error: ${e.reason?.message ?? e.reason}`)
);

async function boot() {
  const { scene, view } = createView(PROGRESS_WEBSCENE_ID);

  // Watchdog: if the scene never becomes ready, say so instead of hanging.
  const watchdog = setTimeout(() => {
    showBootError(
      "Scene is taking unusually long to load — check the browser console (F12) for the underlying error."
    );
  }, 20000);

  try {
    await view.when();
  } catch (err) {
    clearTimeout(watchdog);
    showBootError(`Unable to load WebScene: ${err?.message ?? err}`);
    return;
  }
  clearTimeout(watchdog);

  // Fade out the boot veil once the scene is interactive.
  document.getElementById("boot").classList.add("is-hidden");

  // Per-layer visibility toggles (reused from the planned-schedule view).
  createLayerVisibility(scene);

  // On this view the layer list folds into the right-hand widget stack: a
  // nav-stack button reveals it as a flyout (same pattern as the slice tool).
  wireLayersFlyout();

  // Custom navigation controls.
  wireNavControls(view);

  // Bottom-center turntable orbit (no timeline on this view).
  createSpin(view);

  // Click a component to highlight it + show its real construction status.
  createProgressInteraction(view);

  // Slice tool: cut an interactive plane through the model.
  createSlice(view);

  // Wire the Schedule (4D) ↔ Financials (5D) view toggle and its controls.
  createFinancialControls();

  // Live ArcGIS Velocity sensor network: pulsing 3D markers for every noise,
  // dust, gas and wind sensor, plus the shared store that drives the panel.
  createVelocityLive({ scene, view });

  // Bridge so the embedded AI assistant can read the live schedule/cost figures
  // (window.CT3D) for its IoT→cost analysis.
  const aiBridge = installAiBridge();

  // Live on-site environmental sensor panel (top-right, draggable) — its wind,
  // noise, dust and gas figures come straight from the Velocity feeds above.
  createSensorPanel();

  // "Filter 3D Map by Cost" pills recolor the building components in 3D.
  const overlays = createCostOverlays(scene);

  // "Clear filters" — restore the model's original real-status symbology and
  // reset any layer isolation, returning to the initial view.
  document.getElementById("finClearFilters")?.addEventListener("click", () => {
    overlays?.clear();
    document.getElementById("progResetLayers")?.click();
  });

  // Real construction status vs. planned schedule. Failures here must not blank
  // the whole view — fall back to an empty panel that reads "unavailable".
  try {
    const data = await collectConstructionStatus(scene);
    renderProgressPanel(data.summary);
    renderFinancialPanel(data.summary);
    aiBridge.setSummary(data.summary);
    // Per-layer isolate: filters the render and every metric to one layer.
    createProgressLayers(scene, data, (summary, scope) =>
      renderProgressPanel(summary, { scope })
    );
  } catch (err) {
    console.warn("Progress statistics unavailable", err);
    renderProgressPanel({
      total: 0,
      counts: {},
      behind: 0,
      behindPct: 0,
      installed: 0,
      installedPct: 0
    });
    renderFinancialPanel({});
  }
}

/** Toggle the layer-visibility flyout from its button in the right-hand stack. */
function wireLayersFlyout() {
  const button = document.getElementById("layersBtn");
  const panel = document.getElementById("layersPanel");
  const closeBtn = document.getElementById("layersClose");
  if (!button || !panel) return;

  const setOpen = (open) => {
    button.classList.toggle("is-active", open);
    button.setAttribute("aria-pressed", String(open));
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
  };

  button.addEventListener("click", () =>
    setOpen(!panel.classList.contains("is-open"))
  );
  closeBtn?.addEventListener("click", () => setOpen(false));
}

/** Hook the minimalist right-hand nav buttons up to the SceneView. */
function wireNavControls(view) {
  const home = view.camera.clone();

  const zoomBy = (factor) =>
    view.goTo({ zoom: view.zoom + factor }, { duration: 400 }).catch(() => {});

  document.getElementById("zoomIn").addEventListener("click", () => zoomBy(1));
  document.getElementById("zoomOut").addEventListener("click", () => zoomBy(-1));
  document
    .getElementById("resetView")
    .addEventListener("click", () =>
      view.goTo(home, { duration: 1200 }).catch(() => {})
    );
}

boot();
