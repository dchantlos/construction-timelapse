// =============================================================================
// interaction.js — hitTest → neon highlight + custom glass tooltip
// =============================================================================

import { BUILDING_LAYERS, PHASES } from "./config.js";

/**
 * Replace the default Esri popup with a custom click experience: clicking a
 * building component highlights it with the SceneView's neon highlight and
 * shows a sleek glass tooltip anchored to the cursor.
 *
 * @param {import("@arcgis/core/views/SceneView").default} view
 */
export function createInteraction(view) {
  const tip = document.getElementById("tooltip");
  const tipTag = document.getElementById("tipTag");
  const tipTitle = document.getElementById("tipTitle");
  const tipStatus = document.getElementById("tipStatus");
  const tipPhase = document.getElementById("tipPhase");

  let highlightHandle = null;

  function clearHighlight() {
    if (highlightHandle) {
      highlightHandle.remove();
      highlightHandle = null;
    }
  }

  function hideTooltip() {
    tip.classList.remove("is-visible");
    tip.setAttribute("aria-hidden", "true");
  }

  function positionTooltip(x, y) {
    const pad = 16;
    const rect = tip.getBoundingClientRect();
    // Flip horizontally/vertically near viewport edges so it never clips.
    const left =
      x + pad + rect.width > window.innerWidth ? x - rect.width - pad : x + pad;
    const top =
      y + pad + rect.height > window.innerHeight ? y - rect.height - pad : y + pad;
    tip.style.left = `${Math.max(pad, left)}px`;
    tip.style.top = `${Math.max(pad, top)}px`;
  }

  /** Derive a friendly layer label + mock status for a hit graphic. */
  function describe(graphic) {
    const rawTitle = graphic?.layer?.title ?? graphic?.layer?.id ?? "Component";
    const match = BUILDING_LAYERS.find((l) =>
      rawTitle.toLowerCase().includes(l.id.toLowerCase())
    );

    // Non-sequence context layers (e.g. Construction_Objects) aren't building
    // components — show neutral site-context info instead of a fake phase.
    if (!match) {
      return {
        tag: "Site Context",
        label: rawTitle.replace(/_/g, " "),
        status: "On Site",
        phaseName: "—",
        color: "#38e2ea"
      };
    }

    // Mock status/phase derived from where the layer sits in the sequence.
    const phaseName =
      PHASES.find((p) => match.startAt < p.until)?.name ?? PHASES.at(-1).name;
    const status = match.startAt < 0.5 ? "Installed" : "Recently Built";

    return {
      tag: "Building Component",
      label: match.label,
      status,
      phaseName,
      color: match.color
    };
  }

  view.on("click", async (event) => {
    let response;
    try {
      response = await view.hitTest(event);
    } catch (err) {
      console.warn("hitTest failed", err);
      return;
    }

    const result = response.results.find(
      (r) => r.type === "graphic" && r.graphic?.layer
    );

    clearHighlight();

    if (!result) {
      hideTooltip();
      return;
    }

    const { graphic } = result;

    // Highlight via the owning layerView (works for SceneLayers / 3D objects).
    try {
      const layerView = await view.whenLayerView(graphic.layer);
      highlightHandle = layerView.highlight(graphic);
    } catch (err) {
      console.warn("highlight failed", err);
    }

    const info = describe(graphic);
    tipTag.textContent = info.tag;
    tipTag.style.color = info.color;
    tipTitle.textContent = info.label;
    tipStatus.textContent = info.status;
    tipPhase.textContent = info.phaseName;

    tip.classList.add("is-visible");
    tip.setAttribute("aria-hidden", "false");
    positionTooltip(event.x, event.y);
  });

  // Dismiss highlight + tooltip on Escape for a clean keyboard experience.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearHighlight();
      hideTooltip();
    }
  });
}
