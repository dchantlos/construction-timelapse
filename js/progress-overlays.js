// =============================================================================
// progress-overlays.js — "Filter 3D Map by Cost" overlays for the progress view.
//
// The three cost pills under "Filter 3D Map by Cost" recolor the building's
// components in the live 3D scene by their real construction status (the
// CStatus field), each pill telling a different money story:
//   • budget  — every component shaded by budget / earned-value status
//   • billing — only work installed (and therefore invoiced) this cycle glows
//   • risk    — schedule-slipped components light up as liquidated-damage risk
//
// Applied client-side via a UniqueValueRenderer keyed on CStatus (the attribute
// is already loaded per feature, so no /query endpoint is required).
// =============================================================================

import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer.js";
import MeshSymbol3D from "@arcgis/core/symbols/MeshSymbol3D.js";
import FillSymbol3DLayer from "@arcgis/core/symbols/FillSymbol3DLayer.js";

/** A flat 3D fill in a single solid color for a building component. */
function fill(color) {
  return new MeshSymbol3D({
    symbolLayers: [new FillSymbol3DLayer({ material: { color } })]
  });
}

/** Build a CStatus-keyed renderer from a value→color map plus a fallback. */
function statusRenderer(colorByStatus, defaultColor) {
  return new UniqueValueRenderer({
    field: "CStatus",
    defaultSymbol: fill(defaultColor),
    uniqueValueInfos: Object.entries(colorByStatus).map(([value, color]) => ({
      value,
      symbol: fill(color)
    }))
  });
}

/** Muted slate for components that aren't part of a given overlay's story. */
const DIM = "#2b3546";

/** One renderer per cost overlay, keyed by the pill's data-overlay value. */
const OVERLAY_RENDERERS = {
  // Earned value: the published status palette (green → blue → rust → gray).
  budget: statusRenderer(
    {
      Installed: "#4ade80",
      Scheduled_10_Days: "#3b82f6",
      Scheduled_11_to_30_Days: "#c1440e",
      Scheduled_31_Plus_Days: "#64748b"
    },
    "#64748b"
  ),
  // Current draw: only installed (billable) work glows; the rest recedes.
  billing: statusRenderer({ Installed: "#38e2ea" }, DIM),
  // Risk: slipped components light up (amber → red); safe work stays muted.
  risk: statusRenderer(
    {
      Installed: "#1f4a37",
      Scheduled_10_Days: "#f59e0b",
      Scheduled_11_to_30_Days: "#ef4444",
      Scheduled_31_Plus_Days: DIM
    },
    DIM
  )
};

/** Caption shown under the pills so the effect is unmistakable on click. */
const OVERLAY_NOTES = {
  budget:
    "Every component shaded by budget status — earned value in green, over-budget risk in rust.",
  billing:
    "Highlighting installed work invoiced this billing cycle — $5.41M current draw.",
  risk:
    "Red and amber zones flag schedule slippage exposed to liquidated-damage penalties."
};

/** Caption shown when no cost lens is applied — the initial real-status view. */
const CLEARED_NOTE =
  "Showing real construction status — pick a cost lens above to recolor the model.";

/**
 * Context / basemap layers carry no CStatus, so they must never be recolored.
 * Mirrors the exclusion set used by progress-stats.js.
 */
function isBuildingLayer(title = "") {
  const n = title
    .replace(/\s*\(current\)\s*$/i, "")
    .replace(/[\s_]/g, "")
    .toLowerCase();
  return !(
    n === "constructionobjects" ||
    n === "buildings" ||
    n.includes("place") ||
    n.includes("label")
  );
}

/**
 * Wire the "Filter 3D Map by Cost" pills so each one recolors the building's
 * components in the 3D scene. Visual pill state (the active highlight) is owned
 * separately by wireOverlayPills(); this owns the map effect and the caption.
 *
 * Returns a { clear } handle that restores the model's original published
 * symbology (the real construction-status render) and deselects every pill —
 * i.e. the initial view, NOT the budget lens.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 * @returns {{ clear: () => void } | undefined}
 */
export function createCostOverlays(scene) {
  const group = document.getElementById("finOverlays");
  if (!group) return undefined;

  const note = document.getElementById("finOverlayNote");
  const layers = scene.allLayers
    .filter((layer) => layer.type === "scene" && isBuildingLayer(layer.title))
    .toArray();

  // Remember each layer's published renderer (the initial real-status symbology)
  // so "Clear filters" can restore it exactly, instead of a cost lens.
  const original = new Map();
  const remember = (layer) => {
    if (!original.has(layer)) original.set(layer, layer.renderer ?? null);
  };
  for (const layer of layers) layer.when(() => remember(layer)).catch(() => {});

  const apply = (overlay) => {
    const renderer = OVERLAY_RENDERERS[overlay];
    if (!renderer) return;
    for (const layer of layers) {
      remember(layer); // capture the original before the first overwrite
      layer.renderer = renderer.clone(); // clone — a renderer is owned by one layer
    }
    if (note && OVERLAY_NOTES[overlay]) note.textContent = OVERLAY_NOTES[overlay];
  };

  /** Restore the published real-status symbology and deselect every pill. */
  const clear = () => {
    for (const layer of layers) {
      if (!original.has(layer)) continue;
      const orig = original.get(layer);
      layer.renderer = orig ? orig.clone() : null;
    }
    for (const pill of group.querySelectorAll(".fin-pill")) {
      pill.classList.remove("is-active");
      pill.setAttribute("aria-pressed", "false");
    }
    if (note) note.textContent = CLEARED_NOTE;
  };

  group.addEventListener("click", (event) => {
    const pill = event.target.closest(".fin-pill");
    if (pill) apply(pill.dataset.overlay);
  });

  return { clear };
}
