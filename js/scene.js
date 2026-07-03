// =============================================================================
// scene.js — WebScene + SceneView creation, lighting, and time-extent resolution
// =============================================================================

import esriConfig from "@arcgis/core/config.js";
import WebScene from "@arcgis/core/WebScene.js";
import SceneView from "@arcgis/core/views/SceneView.js";
import TimeExtent from "@arcgis/core/time/TimeExtent.js";

import { WEBSCENE_ID, PORTAL_URL, FALLBACK_TIME_EXTENT } from "./config.js";

// Assets (icons, workers, wasm) must resolve from the same CDN version.
esriConfig.assetsPath = "https://js.arcgis.com/5.1/@arcgis/core/assets";

/**
 * Build the WebScene + SceneView, strip the default UI chrome and switch on
 * dramatic sun lighting with shadows.
 *
 * @param {string} [webSceneId=WEBSCENE_ID] Portal item id to open. Defaults to
 *   the time-enabled planned-schedule scene; the progress view passes its own.
 * @returns {{ scene: WebScene, view: SceneView }}
 */
export function createView(webSceneId = WEBSCENE_ID) {
  const scene = new WebScene({
    portalItem: { id: webSceneId, portal: { url: PORTAL_URL } }
  });

  const view = new SceneView({
    container: "viewDiv",
    map: scene,
    qualityProfile: "high",
    // Remove every default widget — we provide our own custom controls.
    ui: { components: [] },
    environment: {
      starsEnabled: true,
      atmosphereEnabled: true,
      // Fixed late-afternoon sun → long, dramatic architectural shadows.
      lighting: {
        type: "sun",
        date: new Date("2025-06-21T15:30:00"),
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

  return { scene, view };
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
