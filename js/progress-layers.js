// =============================================================================
// progress-layers.js — per-layer "isolate & filter" control for the progress
// panel. Clicking a layer shows only that layer in the 3D scene and refilters
// every panel metric (ring, behind, overdue, breakdown) to that layer alone.
// =============================================================================

import { summarizeStatus } from "./progress-stats.js?v=10";
import { BUILDING_LAYERS } from "./config.js?v=10";

const fmt = (n) => n.toLocaleString("en-US");

/** Strip the "(Current)" suffix to recover the clean building-type name. */
function cleanName(title = "") {
  return title.replace(/\s*\(current\)\s*$/i, "").trim();
}

/** Match a building layer to its authored swatch color (falls back to accent). */
function swatchColor(name) {
  const entry = BUILDING_LAYERS.find(
    (l) => l.id.toLowerCase() === name.toLowerCase()
  );
  return entry?.color ?? "#38e2ea";
}

/**
 * Build the "Filter by Layer" list and wire single-layer isolation.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 * @param {{ layers: Array<{ layer: object, title: string, counts: Record<string, number> }>, summary: object }} data
 * @param {(summary: object, scope: string|null) => void} onScope
 *   Invoked with a filtered summary while isolating, or the aggregate on reset.
 * @returns {{ reset: () => void }}
 */
export function createProgressLayers(scene, data, onScope) {
  const list = document.getElementById("progLayerList");
  const resetBtn = document.getElementById("progResetLayers");
  if (!list) return { reset() {} };

  const buildingLayers = data.layers.map((entry) => entry.layer);
  let isolated = null; // the isolated layer, or null for "show all"

  // Alphabetical by clean building-type name for a predictable filter list.
  const ordered = [...data.layers].sort((a, b) =>
    cleanName(a.title).localeCompare(cleanName(b.title))
  );

  const rows = ordered.map((entry) => {
    const name = cleanName(entry.title);
    const color = swatchColor(name);
    const summary = summarizeStatus(entry.counts);

    const li = document.createElement("li");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.title = `Isolate ${name}`;

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.style.boxShadow = `0 0 10px ${color}`;

    const label = document.createElement("span");
    label.className = "layer-name";
    label.textContent = name;

    const state = document.createElement("span");
    state.className = "layer-state";
    if (summary.behind > 0) {
      state.textContent = `${fmt(summary.behind)} late`;
      state.style.color = "var(--danger)";
    } else {
      state.textContent = "on track";
    }

    const iso = document.createElement("span");
    iso.className = "layer-iso";
    iso.textContent = "\u25CE"; // ◎ isolate / focus glyph
    iso.setAttribute("aria-hidden", "true");

    li.append(swatch, label, state, iso);

    const activate = () => toggle(entry, summary);
    li.addEventListener("click", activate);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    list.appendChild(li);
    return { entry, li };
  });

  /** Push the current isolation state to the scene and the row highlights. */
  function applyIsolation() {
    for (const layer of buildingLayers) {
      layer.visible = isolated === null || layer === isolated;
    }
    for (const row of rows) {
      row.li.classList.toggle("is-isolated", row.entry.layer === isolated);
    }
  }

  function toggle(entry, summary) {
    if (isolated === entry.layer) {
      reset();
      return;
    }
    isolated = entry.layer;
    applyIsolation();
    onScope(summary, cleanName(entry.title));
  }

  function reset() {
    isolated = null;
    applyIsolation();
    onScope(data.summary, null);
  }

  if (resetBtn) resetBtn.addEventListener("click", reset);

  return { reset };
}
