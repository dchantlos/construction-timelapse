// =============================================================================
// scene.js — WebScene + SceneView creation, lighting, and time-extent resolution
// =============================================================================

import WebScene from "@arcgis/core/WebScene.js";
import SceneView from "@arcgis/core/views/SceneView.js";
import TimeExtent from "@arcgis/core/time/TimeExtent.js";

import { WEBSCENE_ID, PORTAL_URL, FALLBACK_TIME_EXTENT } from "./config.js?v=15";
import { installSitePad } from "./explode.js?v=2";
import { preparePublicBasemap } from "./basemap.js?v=1";

// Assets (icons, workers, wasm) resolve from the CDN build this module came
// from. Don't override esriConfig.assetsPath: an explicit value points the
// SDK's Calcite components (e.g. the sign-in dialog) at a path that 404s.

/**
 * Build the WebScene + SceneView, strip the default UI chrome and apply the
 * WebScene's authored virtual lighting (even, camera-relative) with shadows.
 * The scene reaches the view once loaded, with a flat build pad under the BIM
 * model (see installSitePad in explode.js) and, for a scene authored on Google
 * Photorealistic 3D, the public basemap swapped in first (see basemap.js) so
 * visitors are never asked to sign in.
 *
 * @param {string} [webSceneId=WEBSCENE_ID] Portal item id to open. Defaults to
 *   the time-enabled planned-schedule scene; the progress view passes its own.
 * @returns {{ scene: WebScene, view: SceneView, basemapMode: Promise<"dark"|"photoreal"|null> }}
 */
export function createView(webSceneId = WEBSCENE_ID) {
  const scene = new WebScene({
    portalItem: { id: webSceneId, portal: { url: PORTAL_URL } }
  });

  const view = new SceneView({
    container: "viewDiv",
    qualityProfile: "high",
    // Remove every default widget — we provide our own custom controls.
    ui: { components: [] },
    environment: {
      starsEnabled: true,
      atmosphereEnabled: true,
      // Match the WebScene's authored daylight: virtual (camera-relative)
      // lighting so the model stays evenly lit regardless of the viewer's local
      // clock/timezone. The previous fixed "sun" date was parsed in local time,
      // so viewers far from the building's timezone saw a night-time scene.
      lighting: {
        type: "virtual",
        directShadowsEnabled: true
      }
    },
    // Neon cyan selection glow used by layerView.highlight().
    highlightOptions: {
      color: [56, 226, 234],
      haloColor: [56, 226, 234],
      haloOpacity: 0.95,
      fillOpacity: 0.18
    }
  });

  // Disagreeable default popups stay off — we render our own tooltip.
  view.popupEnabled = false;

  // Flatten the build pad under the BIM model (for the exploded view) before
  // the view sees the ground — swapping elevation layers on a live view makes
  // the whole scene jump. A scene that fails to load is still handed over, so
  // view.when() rejects with the real error as before.
  let basemapMode = null;
  const ready = scene
    .load()
    .then(async () => {
      basemapMode = await preparePublicBasemap(scene);
      installSitePad(scene);
    })
    .catch(() => {})
    .finally(() => {
      view.map = scene;
    });

  return { scene, view, basemapMode: ready.then(() => basemapMode) };
}

/**
 * Resolve the most appropriate full time extent for the TimeSlider.
 * Priority: union of time-aware layers (after they load) → authored fallback.
 *
 * Note: the scene's own `view.timeExtent` has a null start (cumulative time),
 * so we can't use it directly to bound the slider.
 *
 * @param {WebScene} scene
 * @param {SceneView} view
 * @returns {Promise<TimeExtent>}
 */
export async function resolveTimeExtent(scene, view) {
  // Make sure every layer is loaded so timeInfo is populated.
  try {
    await Promise.all(
      scene.allLayers.map((layer) => layer.load().catch(() => layer))
    );
  } catch (err) {
    console.warn("Some layers failed to load", err);
  }

  // Union of every layer that advertises a fullTimeExtent.
  let start = null;
  let end = null;
  scene.allLayers.forEach((layer) => {
    const ext = layer.timeInfo?.fullTimeExtent;
    if (ext?.start && ext?.end) {
      start = start === null ? ext.start : new Date(Math.min(+start, +ext.start));
      end = end === null ? ext.end : new Date(Math.max(+end, +ext.end));
    } else if ("useViewTime" in layer) {
      // Non-time-aware context layers (e.g. Construction_Objects) must ignore
      // the TimeSlider, otherwise cumulative filtering hides them for the whole
      // animation. Pin them to "always visible".
      layer.useViewTime = false;
      // The scene's context layer ("Construction Objects") is authored hidden —
      // force it on. Tolerate underscore/space naming across WebScene versions.
      if (layer.title?.replace(/[\s_]/g, "") === "ConstructionObjects") {
        layer.visible = true;
      }
    }
  });

  if (start && end) {
    return new TimeExtent({ start, end });
  }

  // Fallback to the WebScene's authored extent so the demo always animates.
  return new TimeExtent({
    start: FALLBACK_TIME_EXTENT.start,
    end: FALLBACK_TIME_EXTENT.end
  });
}
