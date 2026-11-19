// =============================================================================
// app.js — application entry point
// =============================================================================

import TimeSlider from "@arcgis/core/widgets/TimeSlider.js";
import Point from "@arcgis/core/geometry/Point.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { createView, resolveTimeExtent } from "./scene.js?v=17";
import { createDashboard, loadBuildCurves } from "./dashboard.js?v=2";
import { createLayerControl } from "./layers.js?v=2";
import { createLayerVisibility } from "./visibility.js?v=13";
import { createCinematic, whenSceneIdle } from "./cinematic.js?v=25";
import { createAssistant } from "./assistant.js?v=24";
import { createInteraction } from "./interaction.js?v=3";
import { createSlice } from "./slice.js";
import { createExplode } from "./explode.js?v=2";
import { createBasemapToggle } from "./basemap.js?v=4";
import { BUILDING_LAYERS, PROJECT, TIME_STEP } from "./config.js?v=15";

/**
 * The roadway is a 1.5 km corridor: it opens on the whole alignment, loads the
 * complete model before playing (so no element streams in late or out of
 * order), and plays a quicker sweep without the tower's camera orbit.
 */
const CORRIDOR = PROJECT.id === "linear";
const CORRIDOR_SWEEP_MS = 20000; // the tower's orbiting sweep takes 45 s
const CORRIDOR_FILL = 0.8; // share of the free screen area the corridor spans
const CORRIDOR_PRIME_MAX_MS = 25000; // longest wait for the whole model
const CORRIDOR_VEIL_MAX_MS = 30000; // the loading screen never outstays this

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

  // Fade out the boot veil once the scene is interactive — the corridor keeps
  // it up until its whole model has loaded (below), but a stalled request
  // must never leave the visitor behind it.
  const hideVeil = () => document.getElementById("boot").classList.add("is-hidden");
  if (CORRIDOR) setTimeout(hideVeil, CORRIDOR_VEIL_MAX_MS);
  else hideVeil();

  // --- 4D TimeSlider ---------------------------------------------------------
  const fullTimeExtent = await resolveTimeExtent(scene, view);

  // The authored camera sits close to one end of the corridor: open on the
  // whole alignment instead (this also becomes the home view).
  if (CORRIDOR) frameCorridor(view, scene);

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
  // The camera orbit suits the compact tower; the 1.5 km roadway keeps its
  // overview while the timeline plays, at a quicker pace, stepping the map so
  // every element draws on time.
  const cinematic = createCinematic(view, timeSlider, fullTimeExtent, {
    orbit: !CORRIDOR,
    ...(CORRIDOR ? { duration: CORRIDOR_SWEEP_MS, settle: true } : {})
  });
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

  // The corridor's I3S nodes stream in as they come into view and time: load
  // every element (timeline at completion) behind the veil, then rewind, so
  // playback never shows parts of the route late or out of order.
  if (CORRIDOR) {
    setBootText("Loading the roadway model");
    cinematic.scrubTo(fullTimeExtent.end);
    const loaded = (async () => {
      const layerViews = await Promise.all(
        corridorLayers(scene).map((layer) => view.whenLayerView(layer).catch(() => null))
      );
      await whenSceneIdle(view, {
        quietMs: 800,
        maxWaitMs: CORRIDOR_PRIME_MAX_MS,
        isUpdating: () => layerViews.some((lv) => lv?.updating)
      });
    })();
    await Promise.race([loaded, new Promise((done) => setTimeout(done, CORRIDOR_PRIME_MAX_MS))]);
    cinematic.scrubTo(fullTimeExtent.start);
    hideVeil();
  }

  // Autoplay the cinematic sequence (timeline, plus the tower's camera orbit)
  // on first visit.
  cinematic.start();
}

/** Swap the boot veil's message, keeping its animated dots. */
function setBootText(text) {
  const label = document.querySelector("#boot .boot__text")?.firstChild;
  if (label?.nodeType === Node.TEXT_NODE) label.nodeValue = text;
}

/** The project's model layers (WebScene titles listed in config). */
function corridorLayers(scene) {
  const ids = new Set(BUILDING_LAYERS.map((l) => l.id));
  return scene.allLayers.toArray().filter((layer) => ids.has(layer.title));
}

/**
 * The screen area left for the model: right of the dashboard (below it on
 * phones), under the top bar, left of the navigation buttons and above the
 * playback controls. In view coordinates.
 */
function freeArea(view) {
  const box = view.container.getBoundingClientRect();
  const rect = (sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    return r?.width ? r : null;
  };
  const top = rect(".topbar")?.bottom ?? box.top;
  const dash = rect(".dashboard");
  const nav = rect(".nav-stack");
  const bottom = Math.min(rect(".asst-fab")?.top ?? Infinity, rect(".dock")?.top ?? Infinity, box.bottom);
  const beside = dash && dash.width < box.width / 2;
  const area = beside
    ? { left: dash.right, top, right: nav?.left ?? box.right, bottom }
    : { left: box.left, top: dash?.bottom ?? top, right: box.right, bottom };
  return {
    left: area.left - box.left,
    top: area.top - box.top,
    right: area.right - box.left,
    bottom: area.bottom - box.top
  };
}

/**
 * Frame the corridor's whole alignment from the authored camera angles, just
 * further back, centred in the free screen area. The SDK fits an extent as
 * seen from above, which leaves the near end of a tilted view off screen, so
 * the camera is placed directly and refined on screen until the alignment's
 * two ends span CORRIDOR_FILL of the free area.
 */
function frameCorridor(view, scene) {
  let extent = null;
  for (const layer of corridorLayers(scene)) {
    if (!layer.fullExtent) continue;
    extent = extent ? extent.union(layer.fullExtent) : layer.fullExtent.clone();
  }
  if (!extent || extent.spatialReference.isGeographic) return;

  const { xmin, ymin, xmax, ymax, spatialReference } = extent;
  const zmax = extent.zmax ?? 30;
  // The roadway crosses its extent corner to corner, from the West abutment
  // (south-west) to the East approach (north-east): fit those two ends.
  const ends = [0, zmax].flatMap((z) =>
    [[xmin, ymin], [xmax, ymax]].map(([x, y]) => new Point({ x, y, z, spatialReference }))
  );
  const mid = { x: (xmin + xmax) / 2, y: (ymin + ymax) / 2, z: zmax / 2 };
  const area = freeArea(view);
  const areaW = area.right - area.left;
  const areaH = area.bottom - area.top;
  const [fx, fy] = [area.left + areaW / 2, area.top + areaH / 2];

  // The camera keeps the authored heading and tilt and looks along `fwd` at
  // the corridor's middle from `dist` metres, slid by `right`/`up` metres
  // across its image plane to centre the corridor in the free area (sliding
  // doesn't change depths, so it hardly changes the corridor's size).
  // Web Mercator stretches ground distances by 1 / cos(latitude).
  const { heading, tilt } = view.camera;
  const [h, t] = [heading, tilt].map((deg) => (deg * Math.PI) / 180);
  const fwd = [Math.sin(t) * Math.sin(h), Math.sin(t) * Math.cos(h), -Math.cos(t)];
  const rightV = [Math.cos(h), -Math.sin(h), 0];
  const upV = [Math.sin(h) * Math.cos(t), Math.cos(h) * Math.cos(t), Math.sin(t)];
  const stretch = spatialReference.isWebMercator ? Math.cosh(mid.y / 6378137) : 1;
  const at = (offset) =>
    new Point({
      x: mid.x + offset[0] * stretch,
      y: mid.y + offset[1] * stretch,
      z: mid.z + offset[2],
      spatialReference
    });
  let [dist, right, up] = [Math.hypot(xmax - xmin, ymax - ymin) / stretch, 0, 0];
  // Setting the camera is synchronous, so the fit runs within one frame.
  const place = () => {
    const camera = view.camera.clone();
    camera.position = at([0, 1, 2].map((i) => right * rightV[i] + up * upV[i] - dist * fwd[i]));
    camera.heading = heading;
    camera.tilt = tilt;
    view.camera = camera;
  };

  // Sliding moves the near end further than the far end, so each step only
  // goes part of the way (DAMP) to settle without overshooting.
  const DAMP = 0.6;
  try {
    place();
    for (let i = 0; i < 40; i++) {
      const pts = ends.map((p) => view.toScreen(p));
      if (pts.some((p) => !p)) {
        dist *= 1.5;
        place();
        continue;
      }
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const grow = Math.max((x1 - x0) / (areaW * CORRIDOR_FILL), (y1 - y0) / (areaH * CORRIDOR_FILL));
      const [dx, dy] = [(x0 + x1) / 2 - fx, (y0 + y1) / 2 - fy];
      if (Math.abs(grow - 1) < 0.02 && Math.hypot(dx, dy) < 6) break;
      // Pixels per metre across the image plane at the corridor's depth.
      const a = view.toScreen(at([0, 1, 2].map((k) => right * rightV[k] + up * upV[k])));
      const b = view.toScreen(at([0, 1, 2].map((k) => (right + 10) * rightV[k] + up * upV[k])));
      const perMetre = a && b ? Math.hypot(b.x - a.x, b.y - a.y) / 10 : 0;
      if (perMetre > 0) {
        right += (DAMP * dx) / perMetre;
        up -= (DAMP * dy) / perMetre;
      }
      const scale = grow ** DAMP;
      [dist, right, up] = [dist, right, up].map((v) => v * scale);
      place();
    }
  } catch {
    // Keep whatever camera the fit reached.
  }
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
