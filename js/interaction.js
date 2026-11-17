// =============================================================================
// interaction.js — hitTest → neon highlight + custom glass tooltip
// =============================================================================

import { BUILDING_LAYERS, PHASES, FALLBACK_TIME_EXTENT, PROJECT, layerLabel } from "./config.js?v=15";

/**
 * Reference-only context (SwissBuildings 3D, or any basemap layer such as the
 * glass context buildings or the Photorealistic mesh) is never identifiable.
 */
export function isContextOnlyLayer(layer, map) {
  const title = layer?.title ?? "";
  if (title.replace(/[\s_]/g, "").toLowerCase().includes("swissbuilding")) return true;
  const basemap = map?.basemap;
  return !!(
    basemap?.baseLayers?.includes(layer) ||
    basemap?.referenceLayers?.includes(layer) ||
    basemap?.groundLayers?.includes(layer)
  );
}

/** Date formatter in the project's own time zone (local time when unset). */
export function projectDateFormat(options) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: PROJECT.timeZone });
}

/** Epoch ms from a date attribute (epoch number, Date or ISO string). */
function toMs(value) {
  if (value == null || value === "") return NaN;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return Date.parse(value);
}

/** "Jun 21 – 22, 2027" style range for an element's scheduled dates. */
export function scheduleRange(start, end) {
  const s = toMs(start);
  const e = toMs(end);
  if (!Number.isFinite(s)) return "—";
  const fmt = projectDateFormat({ year: "numeric", month: "short", day: "numeric" });
  if (!Number.isFinite(e) || fmt.format(s) === fmt.format(e)) return fmt.format(s);
  return fmt.formatRange ? fmt.formatRange(s, e) : `${fmt.format(s)} – ${fmt.format(e)}`;
}

/** "Ch 1,184–1,216 m · East front" from an element's chainage attributes. */
export function chainageLabel(attrs = {}) {
  const fmt = (n) => Math.round(Number(n)).toLocaleString("en-US");
  const a = Number(attrs.ChainageStart);
  const b = Number(attrs.ChainageEnd);
  let text = "";
  if (Number.isFinite(a)) text = `Ch ${fmt(a)}${Number.isFinite(b) && Math.round(b) !== Math.round(a) ? `–${fmt(b)}` : ""} m`;
  const front = attrs.Sched_WorkFront;
  if (front && front !== "Project") text = text ? `${text} · ${front} front` : `${front} front`;
  return text || "—";
}

/** Display name for a Sched_Phase value — the dashboard's phase name for its code. */
export function phaseLabel(value) {
  if (!value) return "—";
  const code = String(value).match(/^\s*(\d+)\s/)?.[1];
  const named = code && PHASES.find((p) => p.code === code)?.name;
  return named ?? String(value).replace(/^\s*\d+\s+/, "").replace(/^./, (c) => c.toUpperCase());
}

/** Ask every BIM layer to return the project's tooltip attributes on hitTest. */
export function requestTooltipFields(map, extra = []) {
  const wanted = [...(PROJECT.tooltipFields ?? []), ...extra];
  if (!wanted.length) return;
  const ids = new Set(BUILDING_LAYERS.map((l) => l.id.toLowerCase()));
  map?.allLayers.forEach((layer) => {
    if (layer.type !== "scene") return;
    const id = layer.title?.replace(/\s*\(current\)\s*$/i, "").trim().toLowerCase();
    if (!ids.has(id)) return;
    layer.outFields = [...new Set([...(layer.outFields ?? []), ...wanted])];
  });
}

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
  const tipScheduled = document.getElementById("tipScheduled");
  const tipPhase = document.getElementById("tipPhase");
  const tipLocation = document.getElementById("tipLocation");

  // Element-level details (the roadway) ride along with every hitTest.
  requestTooltipFields(view.map);

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

  /** Format a layer's normalized start position (0..1) as its scheduled install date. */
  function scheduledDate(startAt) {
    const { start, end } = FALLBACK_TIME_EXTENT;
    const ms = start.getTime() + startAt * (end.getTime() - start.getTime());
    return new Date(ms).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  /** Derive a friendly layer label + scheduled install date for a hit graphic. */
  function describe(graphic) {
    const rawTitle = graphic?.layer?.title ?? graphic?.layer?.id ?? "Component";
    const match = BUILDING_LAYERS.find((l) =>
      rawTitle.toLowerCase().includes(l.id.toLowerCase())
    );

    // Non-sequence context layers (e.g. Construction_Objects) aren't part of the
    // build sequence — they're already on site, so there's no scheduled date.
    if (!match) {
      return {
        tag: "Site Context",
        label: rawTitle.replace(/_/g, " "),
        scheduled: "On site",
        phaseName: "—",
        color: "#38e2ea"
      };
    }

    // Scheduled install date + phase derived from the layer's place in the plan.
    const phaseName =
      PHASES.find((p) => match.startAt < p.until)?.name ?? PHASES.at(-1).name;

    return {
      tag: "Building Component",
      label: match.label,
      scheduled: scheduledDate(match.startAt),
      phaseName,
      color: match.color
    };
  }

  /** Element-level details for projects whose features carry their schedule. */
  function describeElement(graphic) {
    const a = graphic.attributes ?? {};
    const match = BUILDING_LAYERS.find((l) => l.id === graphic.layer?.title);
    if (!match) return describe(graphic);
    return {
      tag: PROJECT.componentTag,
      label: a.Name || layerLabel(match.id),
      scheduled: scheduleRange(a.Sched_StartDate, a.Sched_EndDate),
      phaseName: phaseLabel(a.Sched_Phase),
      location: chainageLabel(a),
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
      (r) =>
        r.type === "graphic" &&
        r.graphic?.layer &&
        !isContextOnlyLayer(r.graphic.layer, view.map)
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

    const info = PROJECT.tooltipFields ? describeElement(graphic) : describe(graphic);
    tipTag.textContent = info.tag;
    tipTag.style.color = info.color;
    tipTitle.textContent = info.label;
    tipScheduled.textContent = info.scheduled;
    tipPhase.textContent = info.phaseName;
    if (tipLocation) tipLocation.textContent = info.location ?? "—";

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
