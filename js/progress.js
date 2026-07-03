// =============================================================================
// progress.js — entry point for the "Current Construction Progress" view.
//
// Opens the status-rendered WebScene (no timeline) and reports the real build
// progress against the planned schedule: where the plan says we should be vs.
// how many components have actually slipped behind.
// =============================================================================

import { createView } from "./scene.js?v=6";
import { createLayerVisibility } from "./visibility.js?v=6";
import { createSpin } from "./spin.js?v=6";
import { collectConstructionStatus } from "./progress-stats.js?v=6";
import { renderProgressPanel } from "./progress-panel.js?v=6";
import { createProgressLayers } from "./progress-layers.js?v=6";
import { createProgressInteraction } from "./progress-interaction.js?v=6";
import { PROGRESS_WEBSCENE_ID } from "./config.js?v=6";

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

  // Custom navigation controls.
  wireNavControls(view);

  // Bottom-center turntable orbit (no timeline on this view).
  createSpin(view);

  // Click a component to highlight it + show its real construction status.
  createProgressInteraction(view);

  // Real construction status vs. planned schedule. Failures here must not blank
  // the whole view — fall back to an empty panel that reads "unavailable".
  try {
    const data = await collectConstructionStatus(scene);
    renderProgressPanel(data.summary);
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
  }
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
