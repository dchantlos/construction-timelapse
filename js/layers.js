// =============================================================================
// layers.js — interactive building-layer isolation ("ghosting") control
// =============================================================================

import { BUILDING_LAYERS } from "./config.js";

const GHOST_OPACITY = 0.15; // dimmed opacity for non-selected layers

/**
 * Build a controller that can isolate a single building layer (full opacity)
 * while ghosting all the others, then restore them to their authored defaults.
 *
 * Building layers are matched by their WebScene title against the ids in
 * BUILDING_LAYERS, so the basemap / context layers are never touched.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 */
export function createLayerControl(scene) {
  const ids = new Set(BUILDING_LAYERS.map((l) => l.id));

  // The operational building layers, flattened out of any group layers.
  const buildingLayers = scene.allLayers
    .filter((layer) => ids.has(layer.title))
    .toArray();

  // Remember each layer's authored opacity so reset is exact.
  const defaults = new Map(buildingLayers.map((l) => [l, l.opacity]));

  let isolatedId = null;

  /**
   * Isolate the given layer id. Clicking the already-isolated layer toggles
   * the effect back off.
   * @returns {string|null} the id now isolated, or null if cleared
   */
  function isolate(layerId) {
    if (isolatedId === layerId) {
      reset();
      return null;
    }

    isolatedId = layerId;
    for (const layer of buildingLayers) {
      layer.opacity = layer.title === layerId ? 1 : GHOST_OPACITY;
    }
    return isolatedId;
  }

  /** Restore every building layer to its authored opacity. */
  function reset() {
    isolatedId = null;
    for (const layer of buildingLayers) {
      layer.opacity = defaults.get(layer) ?? 1;
    }
  }

  return { isolate, reset };
}
