// =============================================================================
// bcfViewer.js — fly to a BCF/IDS issue and ghost-highlight the failing
// elements in the ArcGIS SceneView.
//
// A stakeholder clicks a failing rule; the model flies to the saved viewpoint,
// fades the compliant building to a translucent grey "ghost", and lifts the
// offending elements back to full colour with a warm glow — so you can see the
// problem straight through the walls. Built on standard @arcgis/core:
//   • view.goTo()                          — camera animation
//   • SceneLayer.createQuery() + queryObjectIds()
//   • FeatureEffect + FeatureFilter        — included / excluded visual effects
//
// Note on colour: FeatureEffect filters are CSS-like functions (opacity,
// grayscale, drop-shadow, saturate…), so we cannot flood-fill the failing
// elements solid red. Instead the rest of the model is ghosted and the failing
// elements are emphasised with an orange glow plus a crisp highlight outline —
// which reads clearly as "these are the problem elements".
// =============================================================================

import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect.js";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter.js";

import { bcfPerspectiveToCamera } from "./bcfExport.js?v=1";

// Failing elements pop; everything else ghosts to translucent grey.
const INCLUDED_EFFECT = "drop-shadow(0 0 8px rgba(255, 90, 0, 0.95)) saturate(1.6)";
const EXCLUDED_EFFECT = "opacity(0.2) grayscale(100%)";

/** Escape single quotes for a SQL IN(...) literal. */
const sqlQuote = (v) => `'${String(v).replace(/'/g, "''")}'`;

/**
 * Resolve a layer's SceneLayerView without ever hanging. Some published I3S
 * scene layers (no associated feature layer) never attach an independent
 * layerView, so view.whenLayerView() can wait forever — race it against a
 * timeout and return null so callers can degrade gracefully.
 */
function resolveLayerView(view, layer, timeout = 4000) {
  if (!layer || typeof view?.whenLayerView !== "function") return Promise.resolve(null);
  return Promise.race([
    view.whenLayerView(layer).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), timeout))
  ]);
}

/**
 * Create a highlighter bound to one SceneView. It tracks every layerView it
 * touches so a single clear() restores the whole model.
 *
 * @param {object} opts
 * @param {import("@arcgis/core/views/SceneView").default} opts.view
 */
export function createBcfHighlighter({ view }) {
  /** @type {Set<__esri.SceneLayerView>} layerViews we have applied effects to. */
  const touched = new Set();
  let highlightHandles = [];

  /**
   * Fly to the issue viewpoint and ghost-highlight its failing elements.
   *
   * @param {object} opts
   * @param {__esri.SceneLayer} opts.layer  BIM scene layer holding the elements.
   * @param {__esri.SceneLayerView} [opts.layerView] Resolved view of that layer.
   * @param {object} opts.bcfData
   * @param {string[]} [opts.bcfData.guids] IFC GlobalIds to highlight.
   * @param {import("@arcgis/core/Camera").default|object} [opts.bcfData.camera]
   *   Native ArcGIS camera (or {position, heading, tilt}) to fly to.
   * @param {object} [opts.bcfData.perspective] BCF PerspectiveCamera (fallback).
   * @param {string} [opts.bcfData.guidField="GlobalId"] Field carrying the GUID.
   * @param {__esri.SceneView} [opts.view] Override the bound view.
   * @returns {Promise<{ objectIds: number[], flew: boolean }>}
   */
  async function highlight({ layer, layerView, bcfData = {}, view: viewOverride } = {}) {
    const sceneView = viewOverride ?? view;
    const guidField = bcfData.guidField ?? "GlobalId";

    // 1) Fly-to — prefer a native ArcGIS camera; fall back to a BCF perspective.
    let flew = false;
    const camera =
      bcfData.camera ??
      (bcfData.perspective ? bcfPerspectiveToCamera(bcfData.perspective) : null);
    if (camera) {
      const target = camera.position
        ? { position: camera.position, heading: camera.heading, tilt: camera.tilt }
        : camera;
      await sceneView.goTo(target, { duration: 1200 }).catch(() => {});
      flew = true;
    }

    // 2) Resolve the layerView and query the failing objectIds by GlobalId.
    const lv = layerView ?? (await resolveLayerView(sceneView, layer));
    if (!lv || !layer) return { objectIds: [], flew };

    let objectIds = [];
    const guids = (bcfData.guids ?? []).filter(Boolean);
    if (guids.length && layer.createQuery) {
      const query = layer.createQuery();
      query.where = `${guidField} IN (${guids.map(sqlQuote).join(",")})`;
      try {
        objectIds = await layer.queryObjectIds(query);
      } catch (err) {
        console.warn("BCF highlight: queryObjectIds failed", err);
      }
    }
    if (!objectIds.length) return { objectIds: [], flew };

    // 3) Ghost the rest of the building; lift the failing elements out.
    lv.featureEffect = new FeatureEffect({
      filter: new FeatureFilter({ objectIds }),
      includedEffect: INCLUDED_EFFECT,
      excludedEffect: EXCLUDED_EFFECT
    });
    touched.add(lv);

    // A crisp outline on top of the effect makes the target unmistakable.
    highlightHandles.push(lv.highlight(objectIds));

    return { objectIds, flew };
  }

  /**
   * Best-effort glow of entire failing layers when per-element data isn't
   * published. A FeatureEffect with no filter applies its includedEffect to
   * every feature, so the whole component blooms; dimming of the other layers
   * is handled by the caller's opacity control. Degrades silently if an I3S
   * layer never attaches a layerView. Undone by clear().
   */
  async function glowLayers(layers = [], { view: viewOverride } = {}) {
    const sceneView = viewOverride ?? view;
    await Promise.all(
      layers.filter(Boolean).map(async (layer) => {
        const lv = await resolveLayerView(sceneView, layer);
        if (!lv) return;
        lv.featureEffect = new FeatureEffect({ includedEffect: INCLUDED_EFFECT });
        touched.add(lv);
      })
    );
  }

  /** Remove every applied effect + highlight and restore the model. */
  function clear() {
    for (const lv of touched) lv.featureEffect = null;
    touched.clear();
    for (const handle of highlightHandles) handle?.remove?.();
    highlightHandles = [];
  }

  return { highlight, glowLayers, clear };
}
