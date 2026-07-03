// =============================================================================
// progress-stats.js — aggregate real construction status (CStatus) across the
// "(Current)" building layers using the public I3S precomputed statistics.
//
// The scene-service layers don't expose a classic /query endpoint, but every
// public I3S layer ships a precomputed value→count histogram per attribute.
// We read that anonymously (CORS-enabled) and sum it across the building layers.
// =============================================================================

import esriRequest from "@arcgis/core/request.js";
import { PROGRESS_STATUS } from "./config.js?v=1";

/**
 * Derive the I3S layer-resource URL (…/SceneServer/layers/N) for a SceneLayer,
 * tolerating whether the SDK exposed the service root or the layer resource.
 *
 * @param {{ url?: string, layerId?: number }} layer
 * @returns {string}
 */
function layerResourceUrl(layer) {
  const base = (layer.url || "").replace(/\/+$/, "");
  if (/\/layers\/\d+$/.test(base)) return base;
  return `${base}/layers/${layer.layerId ?? 0}`;
}

/**
 * Fetch the CStatus value→count histogram for a single scene layer from its
 * precomputed statistics resource. Returns an empty object on any miss so the
 * overall aggregate degrades gracefully.
 *
 * @param {object} layer A loaded SceneLayer.
 * @returns {Promise<Record<string, number>>}
 */
async function fetchLayerStatusCounts(layer) {
  const resource = layerResourceUrl(layer);

  // 1. Layer JSON → locate the CStatus statistics href.
  const meta = await esriRequest(resource, {
    query: { f: "json" },
    responseType: "json"
  });
  const infos = meta.data?.statisticsInfo ?? [];
  const info = infos.find((s) => s.name === PROGRESS_STATUS.field);
  if (!info?.href) return {};

  // 2. Resolve the (relative) href against the layer resource and read stats.
  const statsUrl = new URL(info.href, `${resource}/`).toString();
  const stats = await esriRequest(statsUrl, {
    query: { f: "json" },
    responseType: "json"
  });

  const bag = stats.data?.stats ?? stats.data ?? {};
  const counts = {};
  for (const entry of bag.mostFrequentValues ?? []) {
    if (entry?.value == null) continue;
    counts[entry.value] = (counts[entry.value] ?? 0) + Number(entry.count || 0);
  }
  return counts;
}

/**
 * Aggregate CStatus across every operational building layer in the scene,
 * excluding the non-status "Construction Objects" context layer.
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 * @returns {Promise<{
 *   total: number,
 *   counts: Record<string, number>,
 *   behind: number,
 *   behindPct: number,
 *   installed: number,
 *   installedPct: number
 * }>}
 */
export async function aggregateConstructionStatus(scene) {
  const layers = scene.allLayers
    .filter((layer) => layer.type === "scene")
    .filter((layer) => layer.title?.replace(/[\s_]/g, "") !== "ConstructionObjects")
    .toArray();

  const perLayer = await Promise.all(
    layers.map((layer) =>
      fetchLayerStatusCounts(layer).catch((err) => {
        console.warn(`CStatus stats unavailable for ${layer.title}`, err);
        return {};
      })
    )
  );

  const counts = {};
  for (const layerCounts of perLayer) {
    for (const [value, count] of Object.entries(layerCounts)) {
      counts[value] = (counts[value] ?? 0) + count;
    }
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const behind = PROGRESS_STATUS.behindValues.reduce(
    (sum, value) => sum + (counts[value] ?? 0),
    0
  );
  const installed = counts[PROGRESS_STATUS.installedValue] ?? 0;

  return {
    total,
    counts,
    behind,
    behindPct: total ? (behind / total) * 100 : 0,
    installed,
    installedPct: total ? (installed / total) * 100 : 0
  };
}
