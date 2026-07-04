// =============================================================================
// progress-interaction.js — hitTest → neon highlight + real-status glass tooltip
//
// The progress-scene twin of interaction.js: clicking a building component
// highlights it and surfaces its REAL construction status (the CStatus field
// the scene is rendered by) inside the same minimal glass tooltip used on the
// planned-sequencing view.
// =============================================================================

import { BUILDING_LAYERS, PROGRESS_STATUS } from "./config.js?v=12";

// Friendly label + colour for each CStatus value, keyed for O(1) lookup.
const STATUS_BY_VALUE = new Map(PROGRESS_STATUS.buckets.map((b) => [b.value, b]));

/**
 * Wire a custom click experience on the progress SceneView: highlight the
 * clicked component and show its real construction status in the shared glass
 * tooltip. Clicking empty space or pressing Escape dismisses it.
 *
 * @param {import("@arcgis/core/views/SceneView").default} view
 */
export function createProgressInteraction(view) {
  const tip = document.getElementById("tooltip");
  const tipTag = document.getElementById("tipTag");
  const tipTitle = document.getElementById("tipTitle");
  const tipStatus = document.getElementById("tipStatus");
  const tipSchedule = document.getElementById("tipSchedule");
  if (!tip) return;

  // Make sure the status field rides along in hitTest results on every 3D layer.
  view.map?.allLayers.forEach((layer) => {
    if (layer.type !== "scene") return;
    const current = layer.outFields ?? [];
    if (!current.includes(PROGRESS_STATUS.field)) {
      layer.outFields = [...new Set([...current, PROGRESS_STATUS.field])];
    }
  });

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
    // Flip near viewport edges so the tooltip never clips off-screen.
    const left =
      x + pad + rect.width > window.innerWidth ? x - rect.width - pad : x + pad;
    const top =
      y + pad + rect.height > window.innerHeight ? y - rect.height - pad : y + pad;
    tip.style.left = `${Math.max(pad, left)}px`;
    tip.style.top = `${Math.max(pad, top)}px`;
  }

  /** Read the CStatus value from a graphic, tolerant of field-name casing. */
  function readStatus(attributes) {
    if (!attributes) return null;
    const field = PROGRESS_STATUS.field.toLowerCase();
    const key = Object.keys(attributes).find((k) => k.toLowerCase() === field);
    return key ? attributes[key] : null;
  }

  /** Friendly component name derived from the "(Current)" layer title. */
  function componentLabel(graphic) {
    const rawTitle = graphic?.layer?.title ?? graphic?.layer?.id ?? "Component";
    const match = BUILDING_LAYERS.find((l) =>
      rawTitle.toLowerCase().includes(l.id.toLowerCase())
    );
    return match
      ? match.label
      : rawTitle.replace(/\s*\(current\)\s*$/i, "").replace(/_/g, " ");
  }

  /** Map a CStatus value to a display status, schedule verdict, and colour. */
  function describeStatus(value) {
    const bucket = STATUS_BY_VALUE.get(value);
    if (!bucket) return { status: "On site", schedule: "—", color: "#38e2ea" };
    let schedule = "Upcoming";
    if (value === PROGRESS_STATUS.installedValue) schedule = "Complete";
    else if (PROGRESS_STATUS.behindValues.includes(value)) schedule = "Behind";
    return { status: bucket.label, schedule, color: bucket.color };
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

    const info = describeStatus(readStatus(graphic.attributes));
    tipTag.textContent = "Building Component";
    tipTag.style.color = info.color;
    tipTitle.textContent = componentLabel(graphic);
    tipStatus.textContent = info.status;
    tipStatus.style.color = info.color;
    tipSchedule.textContent = info.schedule;

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
