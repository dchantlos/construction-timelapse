// =============================================================================
// app.js — application entry point
// =============================================================================

import TimeSlider from "@arcgis/core/widgets/TimeSlider.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { createView, resolveTimeExtent } from "./scene.js?v=14";
import { createDashboard, loadBuildCurves } from "./dashboard.js?v=2";
import { createLayerControl } from "./layers.js?v=2";
import { createLayerVisibility } from "./visibility.js?v=13";
import { createCinematic } from "./cinematic.js?v=23";
import { createAssistant } from "./assistant.js?v=24";
import { createInteraction } from "./interaction.js?v=3";
import { createSlice } from "./slice.js";
import { createExplode } from "./explode.js?v=2";
import { createBasemapToggle } from "./basemap.js?v=1";
import { PROJECT, TIME_STEP } from "./config.js?v=15";

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
  const { scene, view, basemapMode } = createView();

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
    // The TimeSlider calls this with a single Date for min/max/tick labels but
    // an array of Dates for the "extent" label — guard both so a stray array
    // never throws (which the global error handler would surface on the veil).
    labelFormatFunction: (value) => {
      const fmt = (d) =>
        d instanceof Date
          ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          : d;
      return Array.isArray(value) ? value.map(fmt).join(" – ") : fmt(value);
    }
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
  // Layers without authored timing (the roadway) follow their own schedule,
  // read from each layer's Sched_StartDate statistics.
  loadBuildCurves(scene).then((curves) => {
    if (!curves.size) return;
    dashboard.setCurves(curves);
    dashboard.update(timeSlider.timeExtent, fullTimeExtent);
  });

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

  // --- Slice tool (interactive cut-plane through the model) ------------------
  createSlice(view);

  // --- IDS model audit (buildingSMART openBIM validation; tower only) --------
  if (PROJECT.features.audit) {
    import("./audit.js?v=27").then(({ createAudit }) =>
      createAudit({ scene, view, layerControl })
    );
  }

  // --- Exploded view (lift the model's zones apart) --------------------------
  const explode = createExplode({
    scene,
    view,
    playback: {
      isRunning: () => cinematic.isPlaying(),
      pause: () => cinematic.stop(),
      resume: () => cinematic.start()
    }
  });

  // --- Opt-in Photorealistic basemap (linear project) ------------------------
  // The exploded view's lift assumes the flat build pad, so it's off while the
  // Photorealistic mesh is the ground.
  createBasemapToggle({
    scene,
    initial: await basemapMode,
    onChange: (mode) =>
      explode.setEnabled(
        mode !== "photoreal",
        "Exploded view works on the dark basemap — turn Photorealistic 3D off to use it"
      )
  });

  // --- Timeline assistant (local date/phrase command box) --------------------
  createAssistant({
    fullTimeExtent,
    onDate: (date) => cinematic.scrubTo(date)
  });

  // --- Custom navigation controls --------------------------------------------
  wireNavControls(view);

  // Autoplay the cinematic sequence (timeline + camera orbit) on first visit.
  cinematic.start();
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
