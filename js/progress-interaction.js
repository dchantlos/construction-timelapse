// =============================================================================
// progress-interaction.js — hitTest → neon highlight + real-status glass tooltip
//
// The progress-scene twin of interaction.js: clicking a building component
// highlights it and surfaces its REAL construction status (the CStatus field
// the scene is rendered by) inside the same minimal glass tooltip used on the
// planned-sequencing view.
// =============================================================================

import { BUILDING_LAYERS, PROGRESS_STATUS, PROJECT } from "./config.js?v=15";
import { openSensorPopupForGraphic, closeSensorPopup } from "./velocity-live.js?v=8";
import { isContextOnlyLayer, requestTooltipFields, scheduleRange, chainageLabel } from "./interaction.js?v=3";

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
  const tipLocation = document.getElementById("tipLocation");
  const tipPlanned = document.getElementById("tipPlanned");
  if (!tip) return;

  // Make sure the status field (plus any element details) rides along in
  // hitTest results on every building layer — context layers don't carry it.
  requestTooltipFields(view.map, [PROGRESS_STATUS.field]);

  let highlightHandle = null;
  let enabled = true;
  let pick = 0;

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

  /** Schedule verdict from an element's own progress fields (the roadway). */
  function elementSchedule(attrs) {
    if (readStatus(attrs) === PROGRESS_STATUS.installedValue) return "Complete";
    if (Number(attrs.Prog_Overdue) === 1) {
      const days = Math.round(Number(attrs.Prog_OverdueDays) || 0);
      return days > 0 ? `Behind · ${days} d overdue` : "Behind · due now";
    }
    if (attrs.Prog_TaskState === "In progress") return "In progress";
    const delay = Math.round(Number(attrs.Prog_DelayDays) || 0);
    return delay > 0 ? `Upcoming · forecast +${delay} d` : "Upcoming";
  }

  /** True for a building element that carries its own schedule attributes. */
  function hasElementDetails(graphic) {
    if (!PROJECT.tooltipFields) return false;
    const title = (graphic?.layer?.title ?? "").toLowerCase();
    return BUILDING_LAYERS.some((l) => title.includes(l.id.toLowerCase()));
  }

  view.on("click", async (event) => {
    if (!enabled) return;
    const request = ++pick;
    let response;
    try {
      response = await view.hitTest(event);
    } catch (err) {
      console.warn("hitTest failed", err);
      return;
    }

    if (request !== pick) return;
    const results = response.results.filter(
      (r) =>
        r.type === "graphic" &&
        r.graphic?.layer &&
        !isContextOnlyLayer(r.graphic.layer, view.map)
    );

    clearHighlight();

    // A live Velocity sensor wins: show its reading card, not the component tip.
    for (const r of results) {
      if (openSensorPopupForGraphic(r.graphic, event.x, event.y)) {
        hideTooltip();
        return;
      }
    }
    closeSensorPopup();

    const result = results[0];

    if (!result) {
      hideTooltip();
      return;
    }

    const { graphic } = result;

    // Highlight via the owning layerView (works for SceneLayers / 3D objects).
    try {
      const layerView = await view.whenLayerView(graphic.layer);
      if (request !== pick) return;
      highlightHandle = layerView.highlight(graphic);
    } catch (err) {
      console.warn("highlight failed", err);
    }

    const attrs = graphic.attributes ?? {};
    const info = describeStatus(readStatus(attrs));
    const element = hasElementDetails(graphic);
    tipTag.textContent = PROJECT.componentTag;
    tipTag.style.color = info.color;
    tipTitle.textContent = (element && attrs.Name) || componentLabel(graphic);
    tipStatus.textContent = info.status;
    tipStatus.style.color = info.color;
    tipSchedule.textContent = element ? elementSchedule(attrs) : info.schedule;
    if (tipLocation) tipLocation.textContent = element ? chainageLabel(attrs) : "—";
    if (tipPlanned) {
      tipPlanned.textContent = element ? scheduleRange(attrs.Sched_StartDate, attrs.Sched_EndDate) : "—";
    }

    tip.classList.add("is-visible");
    tip.setAttribute("aria-hidden", "false");
    positionTooltip(event.x, event.y);
  });

  // Dismiss highlight + tooltip on Escape for a clean keyboard experience.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      ++pick;
      clearHighlight();
      hideTooltip();
      closeSensorPopup();
    }
  });

  return {
    setEnabled(value) {
      enabled = value;
      ++pick;
      if (!value) {
        clearHighlight();
        hideTooltip();
        closeSensorPopup();
      }
    }
  };
}
