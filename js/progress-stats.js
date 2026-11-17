// =============================================================================
// progress-stats.js — aggregate real construction status (CStatus) across the
// "(Current)" building layers using the public I3S precomputed statistics.
//
// The scene-service layers don't expose a classic /query endpoint, but every
// public I3S layer ships a precomputed value→count histogram per attribute.
// We read that anonymously (CORS-enabled) and sum it across the building layers.
// =============================================================================

import esriRequest from "@arcgis/core/request.js";
import { PROGRESS_STATUS, PROJECT, ATTRIBUTE_STAT_FIELDS, PORTAL_URL } from "./config.js?v=15";

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
 *  "Places"/"Labels"/"SwissBuildings" variant (reference-only context layers). */
export function isExcludedLayer(title) {
  const n = normalizeTitle(title);
  return (
    EXCLUDED_LAYERS.has(n) ||
    n.includes("place") ||
    n.includes("label") ||
    n.includes("swissbuilding")
  );
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
 * Read a layer's precomputed I3S statistics: the CStatus value→count histogram
 * and, for the attribute-driven (linear) project, the sum / max / most frequent
 * value of every ATTRIBUTE_STAT_FIELDS field. Misses come back empty so the
 * aggregate degrades gracefully.
 *
 * @param {object} layer A loaded SceneLayer.
 * @returns {Promise<{ counts: Record<string, number>, sums: Record<string, number>, max: Record<string, number>, values: Record<string, string> }>}
 */
async function fetchLayerStats(layer) {
  const resource = layerResourceUrl(layer);
  const result = { counts: {}, sums: {}, max: {}, values: {} };

  // 1. Layer JSON → locate each field's statistics href.
  const meta = await esriRequest(resource, {
    query: { f: "json" },
    responseType: "json"
  });
  const hrefs = new Map((meta.data?.statisticsInfo ?? []).map((s) => [s.name, s.href]));
  const fields = [
    PROGRESS_STATUS.field,
    ...(PROJECT.progressModel === "attributes" ? ATTRIBUTE_STAT_FIELDS : [])
  ];

  // 2. Resolve the (relative) hrefs against the layer resource and read stats.
  await Promise.all(
    fields.map(async (field) => {
      const href = hrefs.get(field);
      if (!href) return;
      const stats = await esriRequest(new URL(href, `${resource}/`).toString(), {
        query: { f: "json" },
        responseType: "json"
      });
      const bag = stats.data?.stats ?? stats.data ?? {};
      if (field === PROGRESS_STATUS.field) {
        for (const entry of bag.mostFrequentValues ?? []) {
          if (entry?.value == null) continue;
          result.counts[entry.value] = (result.counts[entry.value] ?? 0) + Number(entry.count || 0);
        }
        return;
      }
      if (Number.isFinite(bag.sum)) result.sums[field] = bag.sum;
      if (Number.isFinite(bag.max)) result.max[field] = bag.max;
      const top = bag.mostFrequentValues?.[0]?.value;
      if (typeof top === "string") result.values[field] = top;
    })
  );
  return result;
}

/**
 * Summarize a CStatus value→count map into the shape the panel renders. With
 * attribute sums (the linear project) the planned target, slippage and lateness
 * come from the elements' Prog_* fields instead of the status buckets.
 *
 * @param {Record<string, number>} counts
 * @param {{ sums?: Record<string, number>, max?: Record<string, number>, values?: Record<string, string> }} [attributes]
 * @returns {{ total:number, counts:Record<string,number>, behind:number, behindPct:number, daysBehind:number, installed:number, installedPct:number, plannedPct?:number, criticalDelayDays?:number, sums?:Record<string,number>, max?:Record<string,number>, values?:Record<string,string> }}
 */
export function summarizeStatus(counts, attributes) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  if (attributes?.sums && Object.keys(attributes.sums).length) {
    const { sums, max = {}, values = {} } = attributes;
    const behind = sums.Prog_Overdue ?? 0;
    const installed = sums.Prog_Installed ?? counts[PROGRESS_STATUS.installedValue] ?? 0;
    return {
      total,
      counts,
      behind,
      behindPct: total ? (behind / total) * 100 : 0,
      // Average lateness of the overdue elements.
      daysBehind: behind ? (sums.Prog_OverdueDays ?? 0) / behind : 0,
      installed,
      installedPct: total ? (installed / total) * 100 : 0,
      plannedPct: total ? ((sums.Prog_Planned ?? 0) / total) * 100 : 0,
      // Forecast slip of the latest work: the critical-path delay.
      criticalDelayDays: max.Prog_DelayDays ?? 0,
      sums,
      max,
      values
    };
  }

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

/** Add one layer's sums / maxima / labels into running totals. */
function accumulate(into, from) {
  for (const [k, v] of Object.entries(from.sums)) into.sums[k] = (into.sums[k] ?? 0) + v;
  for (const [k, v] of Object.entries(from.max)) into.max[k] = Math.max(into.max[k] ?? -Infinity, v);
  for (const [k, v] of Object.entries(from.values)) into.values[k] ??= v;
}

/**
 * Collect CStatus per building layer plus a whole-project aggregate, excluding
 * non-status context layers (Construction Objects, Places, Labels, Buildings).
 *
 * @param {import("@arcgis/core/WebScene").default} scene
 * @returns {ReturnType<typeof collectLayerStats>}
 */
export async function collectConstructionStatus(scene) {
  const sceneLayers = scene.allLayers
    .filter((layer) => layer.type === "scene")
    .filter((layer) => !scene.basemap?.baseLayers?.includes(layer))
    .toArray();
  return collectLayerStats(sceneLayers);
}

/**
 * The scene-service layers of a WebScene item, read straight from its JSON (no
 * view needed) — for pages like report.html that only want the statistics.
 *
 * @param {string} itemId
 * @returns {Promise<Array<{ title: string, url: string }>>}
 */
export async function loadWebSceneLayers(itemId) {
  const { data } = await esriRequest(
    `${PORTAL_URL}/sharing/rest/content/items/${itemId}/data`,
    { query: { f: "json" }, responseType: "json" }
  );
  const layers = [];
  const walk = (list = []) => {
    for (const layer of list) {
      if (layer.layerType === "ArcGISSceneServiceLayer" && layer.url) {
        layers.push({ title: layer.title, url: layer.url });
      }
      walk(layer.layers);
    }
  };
  walk(data?.operationalLayers);
  return layers;
}

/**
 * Read the statistics of each building layer and aggregate them.
 *
 * @param {Array<{ title: string, url: string, layerId?: number }>} sceneLayers
 *   SceneLayers, or plain { title, url } descriptors.
 * @returns {Promise<{
 *   layers: Array<{ layer: object, title: string, counts: Record<string, number>, sums: Record<string, number>, max: Record<string, number>, values: Record<string, string> }>,
 *   summary: ReturnType<typeof summarizeStatus>
 * }>}
 */
export async function collectLayerStats(sceneLayers) {
  const statusLayers = sceneLayers.filter((layer) => !isExcludedLayer(layer.title));

  const layers = await Promise.all(
    statusLayers.map(async (layer) => ({
      layer,
      title: layer.title,
      ...(await fetchLayerStats(layer).catch((err) => {
        console.warn(`CStatus stats unavailable for ${layer.title}`, err);
        return { counts: {}, sums: {}, max: {}, values: {} };
      }))
    }))
  );

  const aggregate = {};
  const attributes = { sums: {}, max: {}, values: {} };
  for (const entry of layers) {
    for (const [value, count] of Object.entries(entry.counts)) {
      aggregate[value] = (aggregate[value] ?? 0) + count;
    }
    accumulate(attributes, entry);
  }

  return { layers, summary: summarizeStatus(aggregate, attributes) };
}
