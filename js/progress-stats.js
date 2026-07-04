// =============================================================================
// progress-stats.js — aggregate real construction status (CStatus) across the
// "(Current)" building layers using the public I3S precomputed statistics.
//
// The scene-service layers don't expose a classic /query endpoint, but every
// public I3S layer ships a precomputed value→count histogram per attribute.
// We read that anonymously (CORS-enabled) and sum it across the building layers.
// =============================================================================

import esriRequest from "@arcgis/core/request.js";
import { PROGRESS_STATUS } from "./config.js?v=12";

/** Non-construction basemap/context layers to hide from the progress panel's
 *  aggregate stats and its "Filter by Layer" list. */
const EXCLUDED_LAYERS = new Set(["constructionobjects", "buildings"]);

/** Normalize a layer title for exclusion matching (drops "(Current)", ws, case). */
function normalizeTitle(title = "") {
  return title
    .replace(/\s*\(current\)\s*$/i, "")
    .replace(/[\s_]/g, "")
    .toLowerCase();
}

/** True for context layers with no CStatus — the excluded set plus any
 *  "Places"/"Labels" variant (e.g. the combined "Places and Labels" ref layer). */
function isExcludedLayer(title) {
  const n = normalizeTitle(title);
  return EXCLUDED_LAYERS.has(n) || n.includes("place") || n.includes("label");
}

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
 * Summarize a CStatus value→count map into the shape the panel renders.
 *
 * @param {Record<string, number>} counts
 * @returns {{ total:number, counts:Record<string,number>, behind:number, behindPct:number, daysBehind:number, installed:number, installedPct:number }}
 */
export function summarizeStatus(counts) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const behind = PROGRESS_STATUS.behindValues.reduce(
    (sum, value) => sum + (counts[value] ?? 0),
    0
  );
  const installed = counts[PROGRESS_STATUS.installedValue] ?? 0;

  // Approximate average lateness: weight each slipped bucket by a representative
  // "days behind" (midpoint of its window), then average over the behind count.
  const behindDaysTotal = PROGRESS_STATUS.behindValues.reduce(
    (sum, value) =>
      sum + (counts[value] ?? 0) * (PROGRESS_STATUS.behindDays?.[value] ?? 0),
    0
  );

  return {
    total,
    counts,
    behind,
    behindPct: total ? (behind / total) * 100 : 0,
    daysBehind: behind ? behindDaysTotal / behind : 0,
    installed,
    installedPct: total ? (installed / total) * 100 : 0
  };
}

/**
 * Collect CStatus per building layer plus a whole-building aggregate, excluding
 * non-status context layers (Construction Objects, Places, Labels, Buildings).
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 * @returns {Promise<{
 *   layers: Array<{ layer: object, title: string, counts: Record<string, number> }>,
 *   summary: ReturnType<typeof summarizeStatus>
 * }>}
 */
export async function collectConstructionStatus(scene) {
  const sceneLayers = scene.allLayers
    .filter((layer) => layer.type === "scene")
    .filter((layer) => !isExcludedLayer(layer.title))
    .toArray();

  const layers = await Promise.all(
    sceneLayers.map(async (layer) => ({
      layer,
      title: layer.title,
      counts: await fetchLayerStatusCounts(layer).catch((err) => {
        console.warn(`CStatus stats unavailable for ${layer.title}`, err);
        return {};
      })
    }))
  );

  const aggregate = {};
  for (const { counts } of layers) {
    for (const [value, count] of Object.entries(counts)) {
      aggregate[value] = (aggregate[value] ?? 0) + count;
    }
  }

  return { layers, summary: summarizeStatus(aggregate) };
}
