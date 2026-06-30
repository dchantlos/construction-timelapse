// =============================================================================
// app.js — application entry point
// =============================================================================

import TimeSlider from "@arcgis/core/widgets/TimeSlider.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { createView, resolveTimeExtent } from "./scene.js";
import { createDashboard } from "./dashboard.js";
import { createLayerControl } from "./layers.js";
import { createLayerVisibility } from "./visibility.js";
import { createCinematic } from "./cinematic.js?v=17";
import { createAssistant } from "./assistant.js?v=17";
import { createInteraction } from "./interaction.js";
import { TIME_STEP } from "./config.js";

/** Surface any error directly on the boot veil so failures are never silent. */
function showBootError(message) {
  const veil = document.getElementById("boot");
  const text = veil?.querySelector(".boot__text");
  const pulse = veil?.querySelector(".boot__pulse");
  if (text) text.textContent = message;
  if (pulse) pulse.style.borderColor = "#fb7185";
  console.error("[AEONIS]", message);
}

window.addEventListener("error", (e) =>
  showBootError(`Script error: ${e.message}`)
);
window.addEventListener("unhandledrejection", (e) =>
  showBootError(`Load error: ${e.reason?.message ?? e.reason}`)
);

async function boot() {
  const { scene, view } = createView();

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

  // --- 4D TimeSlider ---------------------------------------------------------
  const fullTimeExtent = await resolveTimeExtent(scene, view);

  const timeSlider = new TimeSlider({
    container: "timeSlider",
    view, // makes the widget drive time-aware layer filtering
    mode: "cumulative-from-start", // show everything built up to the thumb
    fullTimeExtent,
    timeExtent: { start: fullTimeExtent.start, end: fullTimeExtent.start },
    playRate: 700,
    loop: true,
    // Fine 1-day stops keep cumulative filtering responsive while letting the
    // custom scrubber set arbitrary timeExtents without snapping back.
    stops: { interval: { value: 1, unit: "days" } },
    labelFormatFunction: (value) =>
      value?.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  });

  // --- Dashboard analytics + interactive layer isolation ---------------------
  const layerControl = createLayerControl(scene);
  const dashboard = createDashboard({
    onLayerClick: (layerId) =>
      dashboard.setIsolated(layerControl.isolate(layerId))
  });
  dashboard.update(timeSlider.timeExtent, fullTimeExtent);
  reactiveUtils.watch(
    () => timeSlider.timeExtent,
    (extent) => dashboard.update(extent, fullTimeExtent)
  );

  // Restore all layers to their default visibility/opacity.
  document.getElementById("resetLayers").addEventListener("click", () => {
    layerControl.reset();
    dashboard.setIsolated(null);
  });

  // --- Per-layer visibility toggles ------------------------------------------
  createLayerVisibility(scene);

  // --- Cinematic playback + interaction --------------------------------------
  const cinematic = createCinematic(view, timeSlider, fullTimeExtent);
  createInteraction(view);

  // --- Timeline assistant (local date/phrase command box) --------------------
  createAssistant({
    fullTimeExtent,
    onDate: (date) => cinematic.scrubTo(date)
  });

  // --- Custom navigation controls --------------------------------------------
  wireNavControls(view);
}

/** Hook the minimalist right-hand nav buttons up to the SceneView. */
function wireNavControls(view) {
  const home = view.camera.clone();

  const zoomBy = (factor) =>
    view
      .goTo({ zoom: view.zoom + factor }, { duration: 400 })
      .catch(() => {});

  document.getElementById("zoomIn").addEventListener("click", () => zoomBy(1));
  document.getElementById("zoomOut").addEventListener("click", () => zoomBy(-1));
  document
    .getElementById("resetView")
    .addEventListener("click", () =>
      view.goTo(home, { duration: 1200 }).catch(() => {})
    );
}

boot();
